"""
Alerts Management Router for MachineAlert AI.
Handles alert dispatch, filtering, technician acknowledgment, and resolution workflows.
"""
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Alert, Machine
from ..schemas import AlertAcknowledgeRequest, AlertResolveRequest, AlertResponse

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def serialize_alert(alert: Alert) -> dict:
    """Safely decode JSON factors and actions into response format."""
    try:
        factors = json.loads(alert.top_factors) if alert.top_factors else []
    except Exception:
        factors = []
    try:
        actions = json.loads(alert.recommended_actions) if alert.recommended_actions else []
    except Exception:
        actions = []

    return {
        "id": alert.id,
        "machine_id": alert.machine_id,
        "level": alert.level,
        "message": alert.message,
        "failure_mode": alert.failure_mode,
        "probability": alert.probability,
        "top_factors": factors,
        "recommended_actions": actions,
        "status": alert.status,
        "created_at": alert.created_at,
        "resolved_at": alert.resolved_at,
        "technician_notes": alert.technician_notes,
    }


@router.get("", response_model=List[AlertResponse])
def list_alerts(
    machine_id: Optional[str] = None,
    level: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List system maintenance alerts with optional filtering by asset, severity, or status."""
    query = db.query(Alert)
    if machine_id:
        query = query.filter(Alert.machine_id == machine_id)
    if level:
        query = query.filter(Alert.level == level)
    if status:
        query = query.filter(Alert.status == status)

    alerts = query.order_by(desc(Alert.created_at)).limit(limit).all()
    return [serialize_alert(a) for a in alerts]


@router.get("/{id}", response_model=AlertResponse)
def get_alert(id: int, db: Session = Depends(get_db)):
    """Fetch details for a specific alert ticket."""
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert #{id} not found.")
    return serialize_alert(alert)


@router.patch("/{id}/acknowledge", response_model=AlertResponse)
def acknowledge_alert(id: int, req: AlertAcknowledgeRequest, db: Session = Depends(get_db)):
    """Technician marks an alert as acknowledged / under inspection."""
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert #{id} not found.")

    alert.status = "Acknowledged"
    if req.notes:
        existing = alert.technician_notes or ""
        alert.technician_notes = f"{existing}\n[ACK {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}]: {req.notes}".strip()

    db.commit()
    db.refresh(alert)
    return serialize_alert(alert)


@router.patch("/{id}/resolve", response_model=AlertResponse)
def resolve_alert(id: int, req: AlertResolveRequest, db: Session = Depends(get_db)):
    """Technician documents remediation actions and marks alert as resolved."""
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Alert #{id} not found.")

    alert.status = "Resolved"
    alert.resolved_at = datetime.utcnow()
    existing = alert.technician_notes or ""
    alert.technician_notes = f"{existing}\n[RESOLVED {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}]: {req.technician_notes}".strip()

    # Re-evaluate machine overall status if no remaining open alerts
    open_alerts_count = db.query(Alert).filter(
        Alert.machine_id == alert.machine_id,
        Alert.status.in_(["Open", "Acknowledged"])
    ).count()

    if open_alerts_count == 0:
        machine = db.query(Machine).filter(Machine.id == alert.machine_id).first()
        if machine and machine.status == "Maintenance Required":
            machine.status = "Operational"
            machine.latest_risk_level = "Normal"

    db.commit()
    db.refresh(alert)
    return serialize_alert(alert)
