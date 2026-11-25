"""
Prediction Router for MachineAlert AI.
Handles single-instance and batch CSV telemetry failure inference.
Persists machine readings and auto-generates alerts when machine_id is provided.
"""
import io
import json
from datetime import datetime
from typing import Optional
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..ml_service import ml_service
from ..models import Alert, Machine, MaintenanceRecord, SensorReading
from ..schemas import PredictionRequest, PredictionResponse

router = APIRouter(prefix="", tags=["Prediction"])


@router.post("/predict", response_model=PredictionResponse, status_code=status.HTTP_200_OK)
def predict_machine_telemetry(req: PredictionRequest, db: Session = Depends(get_db)):
    """
    Run predictive maintenance inference on sensor inputs.
    If machine_id is provided, automatically records reading in the database,
    updates machine live risk status, and generates alerts for elevated risk.
    """
    prediction = ml_service.predict(req)

    # If machine_id provided, persist to database
    if req.machine_id:
        machine = db.query(Machine).filter(Machine.id == req.machine_id).first()
        if not machine:
            # Auto-create machine if not already existing
            machine = Machine(
                id=req.machine_id,
                name=f"Industrial Asset {req.machine_id}",
                type=req.type,
                location="Main Factory Floor",
                status="Operational" if prediction.risk_level == "Normal" else "Maintenance Required",
                latest_risk_level=prediction.risk_level,
                latest_probability=prediction.failure_probability,
            )
            db.add(machine)
            db.commit()
            db.refresh(machine)
        else:
            machine.latest_risk_level = prediction.risk_level
            machine.latest_probability = prediction.failure_probability
            if prediction.risk_level == "High Risk":
                machine.status = "Maintenance Required"
            elif prediction.risk_level == "Medium Risk" and machine.status == "Operational":
                machine.status = "Degraded"
            db.commit()

        # Record sensor reading
        reading = SensorReading(
            machine_id=req.machine_id,
            air_temperature=req.air_temperature,
            process_temperature=req.process_temperature,
            rotational_speed=req.rotational_speed,
            torque=req.torque,
            tool_wear=req.tool_wear,
            type=req.type,
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
        prediction.reading_id = reading.id

        # Auto-generate alert if Medium or High risk
        if prediction.risk_level in ["Medium Risk", "High Risk"]:
            # Check for existing open alert on this machine
            existing_alert = db.query(Alert).filter(
                Alert.machine_id == req.machine_id,
                Alert.status.in_(["Open", "Acknowledged"])
            ).first()

            if not existing_alert:
                factors_json = json.dumps([f.model_dump() for f in prediction.top_factors])
                actions_json = json.dumps(prediction.recommended_actions)

                alert = Alert(
                    machine_id=req.machine_id,
                    level=prediction.risk_level,
                    message=f"Elevated failure risk ({prediction.failure_probability}%): {prediction.failure_mode_hint or 'Abnormal sensor signature'}",
                    failure_mode=prediction.failure_mode_hint,
                    probability=prediction.failure_probability,
                    top_factors=factors_json,
                    recommended_actions=actions_json,
                    status="Open",
                    created_at=datetime.utcnow(),
                )
                db.add(alert)
                db.commit()

    return prediction


@router.post("/predict/batch", status_code=status.HTTP_200_OK)
async def predict_batch_csv(file: UploadFile = File(...)):
    """
    Process multi-row CSV telemetry file for high-throughput batch predictive scoring.
    Returns individual prediction results, risk distribution counts, and summary statistics.
    """
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a standard comma-separated .csv file."
        )

    content = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse CSV file: {str(e)}"
        )

    # Column mapping tolerance (support both AI4I exact names and simplified names)
    col_map = {
        "Air temperature [K]": "air_temperature",
        "Air_temperature": "air_temperature",
        "air_temp": "air_temperature",
        "Process temperature [K]": "process_temperature",
        "Process_temperature": "process_temperature",
        "process_temp": "process_temperature",
        "Rotational speed [rpm]": "rotational_speed",
        "Rotational_speed": "rotational_speed",
        "rotational_speed": "rotational_speed",
        "speed": "rotational_speed",
        "Torque [Nm]": "torque",
        "Torque": "torque",
        "torque": "torque",
        "Tool wear [min]": "tool_wear",
        "Tool_wear": "tool_wear",
        "tool_wear": "tool_wear",
        "Type": "type",
        "type": "type",
        "UDI": "udi",
        "Product ID": "product_id",
    }
    df = df.rename(columns={c: col_map[c] for c in df.columns if c in col_map})

    required_fields = ["air_temperature", "process_temperature", "rotational_speed", "torque", "tool_wear"]
    missing = [f for f in required_fields if f not in df.columns]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required sensor columns in CSV: {missing}. Expected columns: {required_fields}"
        )

    results = []
    normal_count = 0
    medium_count = 0
    high_count = 0

    for idx, row in df.iterrows():
        m_type = str(row.get("type", "M")).upper()
        if m_type not in ["L", "M", "H"]:
            m_type = "M"

        req = PredictionRequest(
            machine_id=str(row.get("machine_id", f"ROW-{idx + 1}")),
            air_temperature=float(row["air_temperature"]),
            process_temperature=float(row["process_temperature"]),
            rotational_speed=int(row["rotational_speed"]),
            torque=float(row["torque"]),
            tool_wear=int(row["tool_wear"]),
            type=m_type,
        )

        pred = ml_service.predict(req)
        if pred.risk_level == "Normal":
            normal_count += 1
        elif pred.risk_level == "Medium Risk":
            medium_count += 1
        else:
            high_count += 1

        results.append({
            "row_index": idx + 1,
            "machine_id": req.machine_id,
            "failure_probability": pred.failure_probability,
            "risk_level": pred.risk_level,
            "predicted_failure": pred.predicted_failure,
            "failure_mode_hint": pred.failure_mode_hint,
            "remaining_useful_life": pred.remaining_useful_life,
            "top_factor": pred.top_factors[0].human_text if pred.top_factors else "Nominal",
        })

    return {
        "total_rows": len(results),
        "summary": {
            "normal_count": normal_count,
            "medium_risk_count": medium_count,
            "high_risk_count": high_count,
            "failure_alert_count": medium_count + high_count,
        },
        "records": results,
    }
