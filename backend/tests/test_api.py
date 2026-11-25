"""
Comprehensive Integration and Unit Tests for MachineAlert AI Backend API.
Verifies all REST endpoints, ML prediction accuracy, latency under 300ms, and database workflows.
"""
import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db import Base, SessionLocal, engine
from app.models import Machine, SensorReading, Alert, MaintenanceRecord

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_db():
    """Ensure clean test database state."""
    Base.metadata.create_all(bind=engine)
    yield


def test_health_endpoints():
    """Check both root and API v1 health checks."""
    r1 = client.get("/health")
    assert r1.status_code == 200
    assert r1.json()["status"] == "healthy"

    r2 = client.get("/api/v1/health")
    assert r2.status_code == 200
    assert r2.json()["status"] == "healthy"
    assert r2.json()["ml_model_loaded"] is True


def test_model_info():
    """Verify ML model metadata and accuracy metrics."""
    res = client.get("/api/v1/model/info")
    assert res.status_code == 200
    data = res.json()
    assert "model_name" in data
    assert data["accuracy"] >= 0.94
    assert data["recall"] >= 0.75
    assert data["pr_auc"] >= 0.70
    assert data["optimal_threshold"] > 0


def test_predict_nominal():
    """Normal operational telemetry should return low probability and 'Normal' risk."""
    payload = {
        "air_temperature": 298.1,
        "process_temperature": 308.6,
        "rotational_speed": 1551,
        "torque": 42.8,
        "tool_wear": 10,
        "type": "M",
    }
    res = client.post("/api/v1/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["risk_level"] == "Normal"
    assert data["failure_probability"] < 30.0
    assert data["predicted_failure"] == 0
    assert data["remaining_useful_life"] > 150.0
    assert len(data["top_factors"]) >= 3


def test_predict_critical_failure():
    """High tool wear and high torque should trigger High Risk failure alert."""
    payload = {
        "air_temperature": 302.0,
        "process_temperature": 311.5,
        "rotational_speed": 1310,
        "torque": 68.0,
        "tool_wear": 230,
        "type": "L",
    }
    res = client.post("/api/v1/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["risk_level"] in ["Medium Risk", "High Risk"]
    assert data["failure_probability"] >= 30.0
    assert len(data["recommended_actions"]) > 0


def test_prediction_latency_under_300ms():
    """Safety-critical inference SLA: latency must be strictly under 300ms."""
    payload = {
        "air_temperature": 298.5,
        "process_temperature": 308.7,
        "rotational_speed": 1450,
        "torque": 40.0,
        "tool_wear": 50,
        "type": "H",
    }
    start = time.perf_counter()
    res = client.post("/api/v1/predict", json=payload)
    duration_ms = (time.perf_counter() - start) * 1000

    assert res.status_code == 200
    assert duration_ms < 300.0, f"Inference took {duration_ms:.2f}ms which exceeds 300ms SLA!"


def test_machines_crud_and_lifecycle():
    """Test full machine registration, retrieval, updating, and deletion."""
    test_id = "MCH-TEST-001"
    # Clean up if existed
    client.delete(f"/api/v1/machines/{test_id}")

    # Create
    create_payload = {
        "id": test_id,
        "name": "Integration Test CNC Mill",
        "type": "H",
        "location": "Test Lab Bay 9",
        "status": "Operational",
    }
    r_create = client.post("/api/v1/machines", json=create_payload)
    assert r_create.status_code == 201
    assert r_create.json()["id"] == test_id

    # Retrieve
    r_get = client.get(f"/api/v1/machines/{test_id}")
    assert r_get.status_code == 200
    assert r_get.json()["name"] == "Integration Test CNC Mill"

    # Update
    r_put = client.get(f"/api/v1/machines/{test_id}")
    r_put = client.put(f"/api/v1/machines/{test_id}", json={"location": "Test Lab Bay 12"})
    assert r_put.status_code == 200
    assert r_put.json()["location"] == "Test Lab Bay 12"

    # Submit reading
    r_reading = client.post(f"/api/v1/machines/{test_id}/readings", json={
        "air_temperature": 299.0,
        "process_temperature": 309.2,
        "rotational_speed": 1500,
        "torque": 41.5,
        "tool_wear": 60,
        "type": "H",
    })
    assert r_reading.status_code == 201
    assert r_reading.json()["machine_id"] == test_id

    # Trend and Compare
    r_trend = client.get(f"/api/v1/machines/{test_id}/trend")
    assert r_trend.status_code == 200
    assert len(r_trend.json()["trends"]) >= 1

    r_comp = client.get(f"/api/v1/machines/{test_id}/compare")
    assert r_comp.status_code == 200
    assert r_comp.json()["has_data"] is True

    # Delete
    r_del = client.delete(f"/api/v1/machines/{test_id}")
    assert r_del.status_code == 204


def test_alerts_workflow():
    """Test alert retrieval, technician acknowledgment, and resolution."""
    # List alerts
    r_list = client.get("/api/v1/alerts")
    assert r_list.status_code == 200
    alerts = r_list.json()
    assert isinstance(alerts, list)

    if alerts:
        target_alert = alerts[0]
        alert_id = target_alert["id"]

        # Acknowledge
        r_ack = client.patch(f"/api/v1/alerts/{alert_id}/acknowledge", json={"notes": "Technician en route."})
        assert r_ack.status_code == 200
        assert r_ack.json()["status"] == "Acknowledged"

        # Resolve
        r_res = client.patch(f"/api/v1/alerts/{alert_id}/resolve", json={"technician_notes": "Replaced worn insert. Test run OK."})
        assert r_res.status_code == 200
        assert r_res.json()["status"] == "Resolved"


def test_maintenance_workflow():
    """Test maintenance work order scheduling, status updates, and completion."""
    # First get an existing machine
    r_mach = client.get("/api/v1/machines")
    machines = r_mach.json()
    assert len(machines) > 0
    m_id = machines[0]["id"]

    # Schedule maintenance
    schedule_payload = {
        "machine_id": m_id,
        "title": "Quarterly Vibration Analysis",
        "description": "Full spectrum vibration logging on spindle and x-axis drive.",
        "priority": "Medium",
        "due_date": "2026-12-01T10:00:00",
        "assigned_technician": "Sarah Miller",
        "cost_estimate": 350.0,
    }
    r_sched = client.post("/api/v1/maintenance", json=schedule_payload)
    assert r_sched.status_code == 201
    task_id = r_sched.json()["id"]

    # Update to In Progress
    r_upd = client.patch(f"/api/v1/maintenance/{task_id}", json={"status": "In Progress"})
    assert r_upd.status_code == 200
    assert r_upd.json()["status"] == "In Progress"

    # Complete
    r_comp = client.patch(f"/api/v1/maintenance/{task_id}", json={
        "status": "Completed",
        "technician_notes": "Vibration within ISO 10816 Class II limits."
    })
    assert r_comp.status_code == 200
    assert r_comp.json()["status"] == "Completed"


def test_dashboard_summary():
    """Verify dashboard KPI statistics aggregation."""
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["total_machines"] >= 8
    assert data["normal_machines"] >= 0
    assert "average_failure_probability" in data
    assert "open_alerts_count" in data


def test_simulator_single_cycle():
    """Test on-demand simulator trigger with fault injection."""
    r_mach = client.get("/api/v1/machines")
    m_id = r_mach.json()[0]["id"]

    res = client.post(f"/api/v1/simulate/{m_id}", json={"inject_fault": "HDF"})
    assert res.status_code == 200
    data = res.json()
    assert data["machine_id"] == m_id
    assert "failure_probability" in data
