"""
Machines Router for MachineAlert AI.
Manages machine registry, live sensor reading logs, telemetry trends, and comparative delta analytics.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..db import get_db
from ..ml_service import ml_service
from ..models import Alert, Machine, MaintenanceRecord, SensorReading
from ..schemas import (
    MachineCreate,
    MachineResponse,
    MachineUpdate,
    PredictionRequest,
    SensorReadingResponse,
)

router = APIRouter(prefix="/machines", tags=["Machines"])


def generate_machine_id(db: Session) -> str:
    """Generate sequential unique machine ID like MCH-0001."""
    count = db.query(Machine).count()
    new_id = f"MCH-{count + 1:04d}"
    while db.query(Machine).filter(Machine.id == new_id).first():
        count += 1
        new_id = f"MCH-{count + 1:04d}"
    return new_id


@router.get("", response_model=List[MachineResponse])
def list_machines(
    type: Optional[str] = None,
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retrieve list of registered industrial assets with multi-parameter filtering."""
    query = db.query(Machine)
    if type:
        query = query.filter(Machine.type == type.upper())
    if status:
        query = query.filter(Machine.status == status)
    if risk_level:
        query = query.filter(Machine.latest_risk_level == risk_level)
    if search:
        query = query.filter(
            (Machine.id.ilike(f"%{search}%")) |
            (Machine.name.ilike(f"%{search}%")) |
            (Machine.location.ilike(f"%{search}%"))
        )
    return query.order_by(Machine.id).all()


@router.post("", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(req: MachineCreate, db: Session = Depends(get_db)):
    """Register a new industrial machine asset with auto-generated ID if omitted."""
    m_id = req.id if req.id else generate_machine_id(db)
    if db.query(Machine).filter(Machine.id == m_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Machine with ID '{m_id}' already exists."
        )

    machine = Machine(
        id=m_id,
        name=req.name,
        type=req.type.upper(),
        location=req.location,
        installation_date=req.installation_date or datetime.utcnow(),
        status=req.status or "Operational",
        latest_risk_level="Normal",
        latest_probability=0.0,
    )
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine


@router.get("/{id}", response_model=MachineResponse)
def get_machine(id: str, db: Session = Depends(get_db)):
    """Fetch complete metadata for a specific machine asset."""
    machine = db.query(Machine).filter(Machine.id == id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Machine '{id}' not found.")
    return machine


@router.put("/{id}", response_model=MachineResponse)
def update_machine(id: str, req: MachineUpdate, db: Session = Depends(get_db)):
    """Update metadata and operational status of a machine."""
    machine = db.query(Machine).filter(Machine.id == id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Machine '{id}' not found.")

    if req.name is not None:
        machine.name = req.name
    if req.type is not None:
        machine.type = req.type.upper()
    if req.location is not None:
        machine.location = req.location
    if req.status is not None:
        machine.status = req.status

    db.commit()
    db.refresh(machine)
    return machine


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_machine(id: str, db: Session = Depends(get_db)):
    """Remove a machine asset and all associated readings, alerts, and maintenance logs."""
    machine = db.query(Machine).filter(Machine.id == id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Machine '{id}' not found.")
    db.delete(machine)
    db.commit()
    return None


@router.post("/{id}/readings", response_model=SensorReadingResponse, status_code=status.HTTP_201_CREATED)
def add_machine_reading(id: str, req: PredictionRequest, db: Session = Depends(get_db)):
    """Submit a live telemetry sensor reading, trigger ML scoring, and update risk status."""
    machine = db.query(Machine).filter(Machine.id == id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Machine '{id}' not found.")

    req.machine_id = id
    req.type = machine.type
    prediction = ml_service.predict(req)

    machine.latest_risk_level = prediction.risk_level
    machine.latest_probability = prediction.failure_probability
    if prediction.risk_level == "High Risk":
        machine.status = "Maintenance Required"

    reading = SensorReading(
        machine_id=id,
        air_temperature=req.air_temperature,
        process_temperature=req.process_temperature,
        rotational_speed=req.rotational_speed,
        torque=req.torque,
        tool_wear=req.tool_wear,
        type=machine.type,
        failure_probability=prediction.failure_probability,
        predicted_failure=prediction.predicted_failure,
        risk_level=prediction.risk_level,
        predicted_mode=prediction.failure_mode_hint,
        remaining_useful_life=prediction.remaining_useful_life,
        timestamp=prediction.timestamp,
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    return reading


@router.get("/{id}/readings", response_model=List[SensorReadingResponse])
def get_machine_readings(
    id: str,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Retrieve historical sensor readings for a specific machine."""
    machine = db.query(Machine).filter(Machine.id == id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Machine '{id}' not found.")

    return db.query(SensorReading).filter(
        SensorReading.machine_id == id
    ).order_by(desc(SensorReading.timestamp)).limit(limit).all()


@router.get("/{id}/trend")
def get_machine_trend(id: str, limit: int = Query(30, ge=5, le=100), db: Session = Depends(get_db)):
    """
    Returns formatted chronological time-series points for temperature, torque,
    tool wear, failure probability, and remaining useful life.
    """
    machine = db.query(Machine).filter(Machine.id == id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Machine '{id}' not found.")

    readings = db.query(SensorReading).filter(
        SensorReading.machine_id == id
    ).order_by(desc(SensorReading.timestamp)).limit(limit).all()

    # Reverse to ascending chronological order
    readings = list(reversed(readings))

    trend_points = [
        {
            "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M"),
            "air_temperature": r.air_temperature,
            "process_temperature": r.process_temperature,
            "rotational_speed": r.rotational_speed,
            "torque": r.torque,
            "tool_wear": r.tool_wear,
            "failure_probability": r.failure_probability,
            "remaining_useful_life": r.remaining_useful_life,
            "risk_level": r.risk_level,
        }
        for r in readings
    ]

    return {
        "machine_id": id,
        "machine_name": machine.name,
        "data_points_count": len(trend_points),
        "trends": trend_points,
    }


@router.get("/{id}/compare")
def compare_machine_readings(id: str, db: Session = Depends(get_db)):
    """
    Compare the latest sensor reading against the previous reading.
    Calculates metric deltas, rate of change, and risk acceleration.
    """
    machine = db.query(Machine).filter(Machine.id == id).first()
    if not machine:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Machine '{id}' not found.")

    latest_readings = db.query(SensorReading).filter(
        SensorReading.machine_id == id
    ).order_by(desc(SensorReading.timestamp)).limit(2).all()

    if not latest_readings:
        return {
            "machine_id": id,
            "has_data": False,
            "message": "No sensor readings recorded for this machine yet."
        }

    current = latest_readings[0]
    previous = latest_readings[1] if len(latest_readings) > 1 else latest_readings[0]

    def delta(curr, prev):
        return round(curr - prev, 2)

    return {
        "machine_id": id,
        "machine_name": machine.name,
        "has_data": True,
        "current": {
            "air_temperature": current.air_temperature,
            "process_temperature": current.process_temperature,
            "rotational_speed": current.rotational_speed,
            "torque": current.torque,
            "tool_wear": current.tool_wear,
            "failure_probability": current.failure_probability,
            "remaining_useful_life": current.remaining_useful_life,
            "risk_level": current.risk_level,
            "timestamp": current.timestamp.isoformat(),
        },
        "previous": {
            "air_temperature": previous.air_temperature,
            "process_temperature": previous.process_temperature,
            "rotational_speed": previous.rotational_speed,
            "torque": previous.torque,
            "tool_wear": previous.tool_wear,
            "failure_probability": previous.failure_probability,
            "remaining_useful_life": previous.remaining_useful_life,
            "risk_level": previous.risk_level,
            "timestamp": previous.timestamp.isoformat(),
        },
        "deltas": {
            "air_temp_delta": delta(current.air_temperature, previous.air_temperature),
            "process_temp_delta": delta(current.process_temperature, previous.process_temperature),
            "rotational_speed_delta": current.rotational_speed - previous.rotational_speed,
            "torque_delta": delta(current.torque, previous.torque),
            "tool_wear_delta": current.tool_wear - previous.tool_wear,
            "probability_delta": delta(current.failure_probability, previous.failure_probability),
            "rul_delta": delta(current.remaining_useful_life, previous.remaining_useful_life),
        }
    }
