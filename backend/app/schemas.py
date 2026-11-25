"""
Pydantic Schemas for Request Validation and Response Serialization in MachineAlert AI.
"""
from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict


# Prediction Schemas
class PredictionRequest(BaseModel):
    machine_id: Optional[str] = Field(None, description="Optional ID of the target industrial machine")
    air_temperature: float = Field(..., ge=250.0, le=350.0, description="Ambient air temperature in Kelvin (typically 295 - 305 K)")
    process_temperature: float = Field(..., ge=260.0, le=360.0, description="Process temperature in Kelvin (typically 305 - 315 K)")
    rotational_speed: int = Field(..., ge=500, le=4000, description="Spindle rotational speed in RPM (typically 1200 - 2800 rpm)")
    torque: float = Field(..., ge=0.0, le=150.0, description="Mechanical torque in Nm (typically 10 - 80 Nm)")
    tool_wear: int = Field(..., ge=0, le=400, description="Cumulative tool wear in minutes (typically 0 - 250 min)")
    type: Literal["L", "M", "H"] = Field("M", description="Product Quality Variant (L: Low 50%, M: Medium 30%, H: High 20%)")


class TopFactor(BaseModel):
    feature: str
    importance: float
    direction: str  # increases_risk, decreases_risk
    human_text: str


class PredictionResponse(BaseModel):
    machine_id: Optional[str] = None
    reading_id: Optional[int] = None
    failure_probability: float = Field(..., description="Predicted failure likelihood percentage (0.0 to 100.0%)")
    risk_level: Literal["Normal", "Medium Risk", "High Risk"]
    predicted_failure: int = Field(..., description="Binary prediction: 0 (Normal) or 1 (Failure)")
    failure_mode_hint: Optional[str] = Field(None, description="Predicted failure pattern (TWF, HDF, PWF, OSF, RNF)")
    remaining_useful_life: float = Field(..., description="Predicted remaining useful life in minutes")
    top_factors: list[TopFactor]
    recommended_actions: list[str]
    timestamp: datetime


# Machine Schemas
class MachineBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    type: Literal["L", "M", "H"]
    location: str = Field(..., min_length=2, max_length=150)
    status: Optional[str] = "Operational"


class MachineCreate(MachineBase):
    id: Optional[str] = Field(None, description="Machine ID. Auto-generated if omitted (e.g. MCH-0001)")
    installation_date: Optional[datetime] = None


class MachineUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[Literal["L", "M", "H"]] = None
    location: Optional[str] = None
    status: Optional[str] = None


class MachineResponse(MachineBase):
    id: str
    installation_date: datetime
    latest_risk_level: str
    latest_probability: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Sensor Reading Schemas
class SensorReadingResponse(BaseModel):
    id: int
    machine_id: Optional[str]
    air_temperature: float
    process_temperature: float
    rotational_speed: int
    torque: float
    tool_wear: int
    type: str
    failure_probability: float
    predicted_failure: int
    risk_level: str
    predicted_mode: Optional[str]
    remaining_useful_life: float
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# Alert Schemas
class AlertResponse(BaseModel):
    id: int
    machine_id: str
    level: str
    message: str
    failure_mode: Optional[str]
    probability: float
    top_factors: list[Any]
    recommended_actions: list[str]
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]
    technician_notes: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class AlertAcknowledgeRequest(BaseModel):
    notes: Optional[str] = Field(None, description="Technician acknowledgment notes")


class AlertResolveRequest(BaseModel):
    technician_notes: str = Field(..., min_length=3, description="Resolution notes and work performed")


# Maintenance Schemas
class MaintenanceCreate(BaseModel):
    machine_id: str
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    priority: Literal["Routine", "Medium", "High", "Critical"] = "Routine"
    due_date: datetime
    assigned_technician: Optional[str] = None
    cost_estimate: Optional[float] = None


class MaintenanceUpdate(BaseModel):
    status: Optional[Literal["Pending", "In Progress", "Completed"]] = None
    technician_notes: Optional[str] = None
    assigned_technician: Optional[str] = None
    completed_at: Optional[datetime] = None


class MaintenanceResponse(BaseModel):
    id: int
    machine_id: str
    title: str
    description: Optional[str]
    priority: str
    status: str
    due_date: datetime
    completed_at: Optional[datetime]
    assigned_technician: Optional[str]
    technician_notes: Optional[str]
    cost_estimate: Optional[float]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Dashboard & Summary Schemas
class DashboardSummaryResponse(BaseModel):
    total_machines: int
    normal_machines: int
    medium_risk_machines: int
    high_risk_machines: int
    open_alerts_count: int
    pending_maintenance_count: int
    average_failure_probability: float
    machines_needing_inspection: int


class ModelInfoResponse(BaseModel):
    model_name: str
    optimal_threshold: float
    accuracy: float
    recall: float
    precision: float
    f1_score: float
    roc_auc: float
    pr_auc: float
    confusion_matrix: list[list[int]]
    status: str = "Healthy"
    version: str = "1.0.0"
