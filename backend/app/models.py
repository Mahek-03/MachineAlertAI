"""
SQLAlchemy ORM Models for MachineAlert AI.
Defines Machines, SensorReadings, Alerts, and MaintenanceRecords.
"""
from datetime import datetime
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from .db import Base


class Machine(Base):
    __tablename__ = "machines"

    id = Column(String(50), primary_key=True, index=True)  # e.g. MCH-0001
    name = Column(String(150), nullable=False)
    type = Column(String(10), nullable=False)  # L, M, H
    location = Column(String(150), nullable=False)
    installation_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="Operational")  # Operational, Maintenance Required, Offline, Degraded
    latest_risk_level = Column(String(50), default="Normal")  # Normal, Medium Risk, High Risk
    latest_probability = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    readings = relationship("SensorReading", back_populates="machine", cascade="all, delete-orphan", order_by="desc(SensorReading.timestamp)")
    alerts = relationship("Alert", back_populates="machine", cascade="all, delete-orphan", order_by="desc(Alert.created_at)")
    maintenance_records = relationship("MaintenanceRecord", back_populates="machine", cascade="all, delete-orphan", order_by="desc(MaintenanceRecord.created_at)")


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=True, index=True)
    air_temperature = Column(Float, nullable=False)  # [K]
    process_temperature = Column(Float, nullable=False)  # [K]
    rotational_speed = Column(Integer, nullable=False)  # [rpm]
    torque = Column(Float, nullable=False)  # [Nm]
    tool_wear = Column(Integer, nullable=False)  # [min]
    type = Column(String(10), nullable=False)  # L, M, H
    failure_probability = Column(Float, nullable=False)  # 0.0 to 100.0%
    predicted_failure = Column(Integer, default=0)  # 0 or 1
    risk_level = Column(String(50), nullable=False)  # Normal, Medium Risk, High Risk
    predicted_mode = Column(String(100), nullable=True)  # TWF, HDF, PWF, OSF, RNF or None
    remaining_useful_life = Column(Float, nullable=False)  # in minutes
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    machine = relationship("Machine", back_populates="readings")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False, index=True)
    level = Column(String(50), nullable=False)  # Medium Risk, High Risk, Critical
    message = Column(Text, nullable=False)
    failure_mode = Column(String(100), nullable=True)
    probability = Column(Float, nullable=False)
    top_factors = Column(Text, nullable=True)  # JSON-encoded list of factor explanations
    recommended_actions = Column(Text, nullable=True)  # JSON-encoded list of actionable steps
    status = Column(String(50), default="Open", index=True)  # Open, Acknowledged, Resolved
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    technician_notes = Column(Text, nullable=True)

    machine = relationship("Machine", back_populates="alerts")


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(50), default="Routine")  # Routine, Medium, High, Critical
    status = Column(String(50), default="Pending", index=True)  # Pending, In Progress, Completed
    due_date = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    assigned_technician = Column(String(100), nullable=True)
    technician_notes = Column(Text, nullable=True)
    cost_estimate = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    machine = relationship("Machine", back_populates="maintenance_records")
