"""
Maintenance Management Router for MachineAlert AI.
Handles maintenance scheduling, Kanban status tracking, work orders, and technician logs.
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Machine, MaintenanceRecord
from ..schemas import MaintenanceCreate, MaintenanceResponse, MaintenanceUpdate

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.get("", response_model=List[MaintenanceResponse])
def list_maintenance_records(
    machine_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Retrieve maintenance work orders and tasks with optional filtering."""
    query = db.query(MaintenanceRecord)
    if machine_id:
        query = query.filter(MaintenanceRecord.machine_id == machine_id)
    if status:
        query = query.filter(MaintenanceRecord.status == status)
    if priority:
        query = query.filter(MaintenanceRecord.priority == priority)

    return query.order_by(MaintenanceRecord.due_date.asc()).all()


@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def schedule_maintenance(req: MaintenanceCreate, db: Session = Depends(get_db)):
    """Schedule a new maintenance inspection or repair order."""
    machine = db.query(Machine).filter(Machine.id == req.machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine asset '{req.machine_id}' does not exist."
        )

    record = MaintenanceRecord(
        machine_id=req.machine_id,
        title=req.title,
        description=req.description,
        priority=req.priority,
        status="Pending",
        due_date=req.due_date,
        assigned_technician=req.assigned_technician or "Unassigned",
        cost_estimate=req.cost_estimate,
        created_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/{id}", response_model=MaintenanceResponse)
def update_maintenance_record(id: int, req: MaintenanceUpdate, db: Session = Depends(get_db)):
    """Update maintenance task progress (Pending -> In Progress -> Completed), technician notes, and completion date."""
    record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Maintenance record #{id} not found.")

    if req.status is not None:
        record.status = req.status
        if req.status == "Completed" and not record.completed_at:
            record.completed_at = datetime.utcnow()
    if req.technician_notes is not None:
        existing = record.technician_notes or ""
        record.technician_notes = f"{existing}\n{req.technician_notes}".strip()
    if req.assigned_technician is not None:
        record.assigned_technician = req.assigned_technician
    if req.completed_at is not None:
        record.completed_at = req.completed_at

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_maintenance_record(id: int, db: Session = Depends(get_db)):
    """Delete a maintenance work order."""
    record = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Maintenance record #{id} not found.")
    db.delete(record)
    db.commit()
    return None
