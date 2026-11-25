"""
Simulator Router for MachineAlert AI.
Generates realistic telemetry cycles with cumulative tool wear drift and on-demand fault injection
to power live demonstrations and dynamic dashboard updates.
"""
import asyncio
import random
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import SessionLocal, get_db
from ..ml_service import ml_service
from ..models import Alert, Machine, SensorReading
from ..schemas import PredictionRequest, SensorReadingResponse

router = APIRouter(prefix="/simulate", tags=["Simulator"])

# In-memory simulator streaming state
_SIMULATOR_STATE = {
    "is_streaming": False,
    "interval_seconds": 4.0,
    "task": None,
}


class SimulateFaultRequest(BaseModel):
    inject_fault: Optional[str] = None  # None, "HDF", "TWF", "PWF", "OSF", "RANDOM"


def run_single_simulation_cycle(machine_id: str, inject_fault: Optional[str], db: Session) -> SensorReading:
    """Simulates a single production duty cycle for a specific machine asset."""
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Machine '{machine_id}' not found.")

    latest = db.query(SensorReading).filter(
        SensorReading.machine_id == machine_id
    ).order_by(SensorReading.timestamp.desc()).first()

    # Determine base values
    if latest:
        air_t = latest.air_temperature + random.uniform(-0.3, 0.3)
        proc_t = latest.process_temperature + random.uniform(-0.3, 0.3)
        speed = int(latest.rotational_speed + random.randint(-20, 20))
        torque = latest.torque + random.uniform(-1.0, 1.0)
        wear = latest.tool_wear + random.randint(1, 3)
    else:
        air_t = 298.5 + random.uniform(-1.0, 1.0)
        proc_t = air_t + 10.0 + random.uniform(-0.5, 0.5)
        speed = random.randint(1450, 1600)
        torque = random.uniform(35.0, 45.0)
        wear = random.randint(10, 80)

    # Apply fault injection if requested
    fault = inject_fault.upper() if inject_fault else None
    if fault == "RANDOM":
        fault = random.choice(["HDF", "TWF", "PWF", "OSF"])

    if fault == "HDF":
        # Heat Dissipation Failure: temp_diff < 8.6 and speed < 1380
        air_t = 302.0
        proc_t = 308.5  # temp_diff = 6.5 K
        speed = 1310
        torque = 48.0
    elif fault == "TWF":
        # Tool Wear Failure: wear between 200 and 240
        wear = random.randint(215, 238)
        torque = 52.0
    elif fault == "PWF":
        # Power Failure: Power > 9000 W
        speed = 1650
        torque = 68.0  # Power = 68 * (1650 * 2pi/60) = 11,749 W
    elif fault == "OSF":
        # Overstrain Failure
        wear = random.randint(205, 230)
        torque = 65.0  # wear * torque > 13000

    # Clamp realistic ranges
    air_t = round(float(np_clip(air_t, 290.0, 315.0)), 1)
    proc_t = round(float(np_clip(proc_t, 298.0, 325.0)), 1)
    speed = int(np_clip(speed, 1100, 2900))
    torque = round(float(np_clip(torque, 10.0, 85.0)), 1)
    wear = int(np_clip(wear, 0, 250))

    req = PredictionRequest(
        machine_id=machine_id,
        air_temperature=air_t,
        process_temperature=proc_t,
        rotational_speed=speed,
        torque=torque,
        tool_wear=wear,
        type=machine.type,
    )

    pred = ml_service.predict(req)

    # Update machine state
    machine.latest_risk_level = pred.risk_level
    machine.latest_probability = pred.failure_probability
    if pred.risk_level == "High Risk":
        machine.status = "Maintenance Required"
    elif pred.risk_level == "Medium Risk" and machine.status == "Operational":
        machine.status = "Degraded"

    # Persist reading
    reading = SensorReading(
        machine_id=machine_id,
        air_temperature=air_t,
        process_temperature=proc_t,
        rotational_speed=speed,
        torque=torque,
        tool_wear=wear,
        type=machine.type,
        failure_probability=pred.failure_probability,
        predicted_failure=pred.predicted_failure,
        risk_level=pred.risk_level,
        predicted_mode=pred.failure_mode_hint,
        remaining_useful_life=pred.remaining_useful_life,
        timestamp=datetime.utcnow(),
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    # Check alert generation
    if pred.risk_level in ["Medium Risk", "High Risk"]:
        import json
        open_alert = db.query(Alert).filter(
            Alert.machine_id == machine_id,
            Alert.status.in_(["Open", "Acknowledged"])
        ).first()

        if not open_alert:
            alert = Alert(
                machine_id=machine_id,
                level=pred.risk_level,
                message=f"Simulated telemetry alert ({pred.failure_probability}%): {pred.failure_mode_hint or 'Elevated stress'}",
                failure_mode=pred.failure_mode_hint,
                probability=pred.failure_probability,
                top_factors=json.dumps([f.model_dump() for f in pred.top_factors]),
                recommended_actions=json.dumps(pred.recommended_actions),
                status="Open",
                created_at=datetime.utcnow(),
            )
            db.add(alert)
            db.commit()

    return reading


def np_clip(val, min_v, max_v):
    return max(min_v, min(max_v, val))


@router.post("/{machine_id}", response_model=SensorReadingResponse)
def simulate_machine_step(
    machine_id: str,
    body: Optional[SimulateFaultRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Trigger a realistic simulated operational cycle for a machine.
    Optionally pass inject_fault ('HDF', 'TWF', 'PWF', 'OSF', 'RANDOM') to test alert triggers.
    """
    fault = body.inject_fault if body else None
    return run_single_simulation_cycle(machine_id, fault, db)


async def background_simulation_worker():
    """Background loop that emits continuous telemetry across registered machines."""
    while _SIMULATOR_STATE["is_streaming"]:
        await asyncio.sleep(_SIMULATOR_STATE["interval_seconds"])
        if not _SIMULATOR_STATE["is_streaming"]:
            break
        try:
            db = SessionLocal()
            machines = db.query(Machine).all()
            if machines:
                # Pick 1-2 random machines to emit a reading
                selected = random.sample(machines, min(2, len(machines)))
                for m in selected:
                    # 5% chance of random fault injection to make demo dynamic
                    fault = "RANDOM" if random.random() < 0.05 else None
                    run_single_simulation_cycle(m.id, fault, db)
            db.close()
        except Exception as e:
            print(f"[WARN] Error in background simulator: {e}")


@router.post("/stream/start")
def start_simulator_stream(background_tasks: BackgroundTasks, interval: float = Query(3.5, ge=1.0, le=30.0)):
    """Start continuous live background telemetry generator for interactive demo."""
    if _SIMULATOR_STATE["is_streaming"]:
        return {"status": "already_running", "interval_seconds": _SIMULATOR_STATE["interval_seconds"]}

    _SIMULATOR_STATE["is_streaming"] = True
    _SIMULATOR_STATE["interval_seconds"] = interval
    background_tasks.add_task(background_simulation_worker)
    return {
        "status": "started",
        "message": f"Continuous background telemetry stream active (cycle interval: {interval}s)."
    }


@router.post("/stream/stop")
def stop_simulator_stream():
    """Stop continuous live background telemetry generator."""
    _SIMULATOR_STATE["is_streaming"] = False
    return {"status": "stopped", "message": "Simulation stream deactivated."}


@router.get("/stream/status")
def get_simulator_status():
    """Check whether background simulator is actively running."""
    return {
        "is_streaming": _SIMULATOR_STATE["is_streaming"],
        "interval_seconds": _SIMULATOR_STATE["interval_seconds"]
    }
