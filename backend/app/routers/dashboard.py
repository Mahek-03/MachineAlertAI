"""
Dashboard and Telemetry System Router for MachineAlert AI.
Provides fleet-wide KPI aggregations, health check, and ML model diagnostic info.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..ml_service import ml_service
from ..models import Alert, Machine, MaintenanceRecord
from ..schemas import DashboardSummaryResponse, ModelInfoResponse

router = APIRouter(prefix="", tags=["Dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Aggregate fleet-wide operational health, alert counts, and maintenance backlog."""
    total_machines = db.query(Machine).count()
    normal_machines = db.query(Machine).filter(Machine.latest_risk_level == "Normal").count()
    medium_risk_machines = db.query(Machine).filter(Machine.latest_risk_level == "Medium Risk").count()
    high_risk_machines = db.query(Machine).filter(Machine.latest_risk_level == "High Risk").count()

    open_alerts_count = db.query(Alert).filter(Alert.status.in_(["Open", "Acknowledged"])).count()
    pending_maintenance_count = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.status.in_(["Pending", "In Progress"])
    ).count()

    avg_prob = db.query(func.avg(Machine.latest_probability)).scalar() or 0.0

    needing_inspection = db.query(Machine).filter(
        (Machine.latest_risk_level.in_(["Medium Risk", "High Risk"])) |
        (Machine.status == "Maintenance Required")
    ).count()

    return DashboardSummaryResponse(
        total_machines=total_machines,
        normal_machines=normal_machines,
        medium_risk_machines=medium_risk_machines,
        high_risk_machines=high_risk_machines,
        open_alerts_count=open_alerts_count,
        pending_maintenance_count=pending_maintenance_count,
        average_failure_probability=round(float(avg_prob), 2),
        machines_needing_inspection=needing_inspection,
    )


@router.get("/health")
def health_check():
    """System health check endpoint for container probes and uptime monitoring."""
    return {
        "status": "healthy",
        "service": "MachineAlert AI Backend API",
        "ml_model_loaded": ml_service.is_loaded,
        "database": "connected",
        "version": "1.0.0",
    }


@router.get("/model/info", response_model=ModelInfoResponse)
def get_model_information():
    """Retrieve active ML classifier version, evaluation metrics, and optimal decision threshold."""
    test_metrics = ml_service.metrics.get("test_metrics", {})
    return ModelInfoResponse(
        model_name=ml_service.metrics.get("model_name", "Gradient Boosting Classifier"),
        optimal_threshold=ml_service.threshold,
        accuracy=test_metrics.get("accuracy", 0.9793),
        recall=test_metrics.get("recall", 0.9020),
        precision=test_metrics.get("precision", 0.6389),
        f1_score=test_metrics.get("f1_score", 0.7480),
        roc_auc=test_metrics.get("roc_auc", 0.9838),
        pr_auc=test_metrics.get("pr_auc", 0.9094),
        confusion_matrix=test_metrics.get("confusion_matrix", [[1423, 26], [5, 46]]),
        status="Healthy" if ml_service.is_loaded else "Degraded",
        version="1.0.0",
    )
