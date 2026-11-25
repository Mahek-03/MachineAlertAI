"""
Database Seeding Script for MachineAlert AI.
Populates 10 industrial machines with 3 weeks of historical sensor readings,
active and resolved alerts, and maintenance work orders.
"""
import json
import random
from datetime import datetime, timedelta
import numpy as np

from .db import Base, SessionLocal, engine
from .ml_service import ml_service
from .models import Alert, Machine, MaintenanceRecord, SensorReading
from .schemas import PredictionRequest


def seed_database():
    """Populate rich realistic demo data for presentation and testing."""
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing demo data
    db.query(MaintenanceRecord).delete()
    db.query(Alert).delete()
    db.query(SensorReading).delete()
    db.query(Machine).delete()
    db.commit()

    print("Seeding 10 industrial machines...")

    machines_data = [
        {
            "id": "MCH-0001",
            "name": "5-Axis CNC Milling Center Alpha",
            "type": "H",
            "location": "Bay A - Precision Machining",
            "status": "Operational",
            "target_risk": "Normal",
            "base_wear": 35,
        },
        {
            "id": "MCH-0002",
            "name": "Heavy Duty CNC Lathe Beta",
            "type": "M",
            "location": "Bay A - Heavy Turning",
            "status": "Maintenance Required",
            "target_risk": "High Risk",
            "base_wear": 224,  # TWF risk
            "fault": "TWF",
        },
        {
            "id": "MCH-0003",
            "name": "High-Precision Cylindrical Grinder",
            "type": "L",
            "location": "Bay B - Micro Finishing",
            "status": "Operational",
            "target_risk": "Normal",
            "base_wear": 42,
        },
        {
            "id": "MCH-0004",
            "name": "Hydraulic Stamping Press 500T",
            "type": "H",
            "location": "Bay C - Metal Forming",
            "status": "Degraded",
            "target_risk": "Medium Risk",
            "base_wear": 178,
            "fault": "OSF_PRECURSOR",
        },
        {
            "id": "MCH-0005",
            "name": "Robotic Injection Molding Cell 04",
            "type": "M",
            "location": "Bay D - Polymer Molding",
            "status": "Operational",
            "target_risk": "Normal",
            "base_wear": 55,
        },
        {
            "id": "MCH-0006",
            "name": "Automated Surface Finishing Mill",
            "type": "L",
            "location": "Bay B - Polishing Line",
            "status": "Operational",
            "target_risk": "Normal",
            "base_wear": 82,
        },
        {
            "id": "MCH-0007",
            "name": "Horizontal Boring Mill Gamma",
            "type": "M",
            "location": "Bay A - Heavy Turning",
            "status": "Degraded",
            "target_risk": "Medium Risk",
            "base_wear": 165,
            "fault": "HDF_PRECURSOR",
        },
        {
            "id": "MCH-0008",
            "name": "High-Speed Laser Cutting Center",
            "type": "H",
            "location": "Bay E - Sheet Metal Fabrication",
            "status": "Maintenance Required",
            "target_risk": "High Risk",
            "base_wear": 195,
            "fault": "PWF",
        },
        {
            "id": "MCH-0009",
            "name": "Rotary Friction Welding Unit",
            "type": "M",
            "location": "Bay C - Structural Joining",
            "status": "Operational",
            "target_risk": "Normal",
            "base_wear": 68,
        },
        {
            "id": "MCH-0010",
            "name": "Precision Wire EDM Center",
            "type": "L",
            "location": "Bay B - Tool & Die",
            "status": "Operational",
            "target_risk": "Normal",
            "base_wear": 25,
        },
    ]

    now = datetime.utcnow()

    for m_info in machines_data:
        m_id = m_info["id"]
        install_date = now - timedelta(days=random.randint(180, 720))

        machine = Machine(
            id=m_id,
            name=m_info["name"],
            type=m_info["type"],
            location=m_info["location"],
            installation_date=install_date,
            status=m_info["status"],
            latest_risk_level=m_info["target_risk"],
            latest_probability=0.0,
            created_at=install_date,
        )
        db.add(machine)
        db.commit()

        # Generate 25 historical readings over past 21 days
        readings = []
        base_wear = m_info["base_wear"]
        fault = m_info.get("fault")

        for step in range(25):
            # Timestamps from 21 days ago up to now
            hours_ago = (24 - step) * 20.0 + random.uniform(-1.0, 1.0)
            t_stamp = now - timedelta(hours=max(0.0, hours_ago))

            # Wear climbs gradually toward base_wear
            wear = max(0, int(base_wear - (24 - step) * 2.5 + random.randint(-2, 2)))

            air_t = round(298.2 + random.uniform(-1.2, 1.5), 1)
            proc_t = round(air_t + 10.2 + random.uniform(-0.8, 0.8), 1)
            speed = random.randint(1450, 1620)
            torque = round(random.uniform(36.0, 44.0), 1)

            # If last 3 steps of a fault machine, inject actual fault conditions
            if step >= 22 and fault:
                if fault == "TWF":
                    wear = 220 + (step - 22) * 5
                    torque = 52.0
                elif fault == "PWF":
                    speed = 1680
                    torque = 66.0
                elif fault == "HDF_PRECURSOR":
                    air_t = 301.8
                    proc_t = 308.2  # temp_diff = 6.4 K
                    speed = 1340
                    torque = 46.0
                elif fault == "OSF_PRECURSOR":
                    wear = 185
                    torque = 58.0

            req = PredictionRequest(
                machine_id=m_id,
                air_temperature=air_t,
                process_temperature=proc_t,
                rotational_speed=speed,
                torque=torque,
                tool_wear=wear,
                type=m_info["type"],
            )
            pred = ml_service.predict(req)

            reading = SensorReading(
                machine_id=m_id,
                air_temperature=air_t,
                process_temperature=proc_t,
                rotational_speed=speed,
                torque=torque,
                tool_wear=wear,
                type=m_info["type"],
                failure_probability=pred.failure_probability,
                predicted_failure=pred.predicted_failure,
                risk_level=pred.risk_level,
                predicted_mode=pred.failure_mode_hint,
                remaining_useful_life=pred.remaining_useful_life,
                timestamp=t_stamp,
            )
            db.add(reading)
            readings.append(reading)

        db.commit()

        # Update machine latest state from final reading
        latest_reading = readings[-1]
        machine.latest_risk_level = latest_reading.risk_level
        machine.latest_probability = latest_reading.failure_probability
        db.commit()

    # Seed Alerts (Mix of Open, Acknowledged, and Resolved)
    print("Seeding alerts and maintenance tasks...")

    # 1. High Risk Alert for MCH-0002
    alert_twf = Alert(
        machine_id="MCH-0002",
        level="High Risk",
        message="Critical Tool Wear Threshold Exceeded (224 min / 240 min endurance limit). Risk of insert chipping.",
        failure_mode="Tool Wear Failure (TWF)",
        probability=88.5,
        top_factors=json.dumps([
            {"feature": "Tool wear [min]", "importance": 0.45, "direction": "increases_risk", "human_text": "Accumulated tool wear (224 min) nearing catastrophic failure limit."},
            {"feature": "Torque [Nm]", "importance": 0.28, "direction": "increases_risk", "human_text": "Elevated torque (52.0 Nm) due to blunted cutting edge."},
            {"feature": "Rotational speed [rpm]", "importance": 0.12, "direction": "decreases_risk", "human_text": "Rotational speed is stable."},
        ]),
        recommended_actions=json.dumps([
            "Halt spindle immediately and replace tungsten carbide cutting insert.",
            "Inspect machined component surface roughness for micro-chatter.",
            "Reset tool counter and calibrate zero-offset.",
        ]),
        status="Open",
        created_at=now - timedelta(hours=3),
    )
    db.add(alert_twf)

    # 2. High Risk Alert for MCH-0008
    alert_pwf = Alert(
        machine_id="MCH-0008",
        level="High Risk",
        message="Spindle Motor Power Consumption Exceeded 9,000 W safety ceiling (11,610 W detected).",
        failure_mode="Power Failure (PWF)",
        probability=79.2,
        top_factors=json.dumps([
            {"feature": "power_w", "importance": 0.52, "direction": "increases_risk", "human_text": "Mechanical power draw (11,610 W) exceeds drive threshold."},
            {"feature": "Torque [Nm]", "importance": 0.31, "direction": "increases_risk", "human_text": "Spindle torque (66.0 Nm) creates high amp draw."},
        ]),
        recommended_actions=json.dumps([
            "Inspect drive amplifier inverter heatsink and bus capacitors.",
            "Verify input three-phase line balance and supply voltage.",
            "Check drive belt tension and motor bearing resistance.",
        ]),
        status="Open",
        created_at=now - timedelta(hours=5),
    )
    db.add(alert_pwf)

    # 3. Medium Risk Alert for MCH-0004
    alert_osf = Alert(
        machine_id="MCH-0004",
        level="Medium Risk",
        message="Elevated Overstrain Factor detected. Hydraulic ram resistance exceeds standard envelope.",
        failure_mode="Overstrain Failure (OSF)",
        probability=48.6,
        top_factors=json.dumps([
            {"feature": "overstrain_proxy", "importance": 0.38, "direction": "increases_risk", "human_text": "Torque-wear index approaching upper fatigue limit."},
            {"feature": "Torque [Nm]", "importance": 0.25, "direction": "increases_risk", "human_text": "Ram torque elevated above baseline."},
        ]),
        recommended_actions=json.dumps([
            "Reduce press cycle velocity by 15%.",
            "Inspect die alignment and lubrication guide bushings.",
        ]),
        status="Acknowledged",
        created_at=now - timedelta(hours=14),
        technician_notes="[ACK 2026-11-20 06:30]: Shift tech Alex Chen assigned to inspect die guide bushings.",
    )
    db.add(alert_osf)

    # 4. Medium Risk Alert for MCH-0007
    alert_hdf = Alert(
        machine_id="MCH-0007",
        level="Medium Risk",
        message="Thermal differential drop (6.4 K) indicates heat exchanger clogging.",
        failure_mode="Heat Dissipation Failure (HDF)",
        probability=44.1,
        top_factors=json.dumps([
            {"feature": "temp_diff", "importance": 0.42, "direction": "increases_risk", "human_text": "Low temperature delta indicates cooling circuit stall."},
            {"feature": "Rotational speed [rpm]", "importance": 0.20, "direction": "increases_risk", "human_text": "Low RPM exacerbates heat buildup."},
        ]),
        recommended_actions=json.dumps([
            "Flush cooling channel filter and verify coolant pump pressure.",
            "Clean radiator fins and inspect airflow intake shroud.",
        ]),
        status="Open",
        created_at=now - timedelta(hours=8),
    )
    db.add(alert_hdf)

    # 5. Resolved Alert for MCH-0001
    alert_res1 = Alert(
        machine_id="MCH-0001",
        level="Medium Risk",
        message="Transient thermal delta warning during roughing pass.",
        failure_mode="Heat Dissipation Failure (HDF)",
        probability=38.0,
        top_factors=json.dumps([
            {"feature": "temp_diff", "importance": 0.35, "direction": "increases_risk", "human_text": "Cooling flow reduced temporarily."},
        ]),
        recommended_actions=json.dumps(["Top off coolant reservoir and inspect pump filter."]),
        status="Resolved",
        created_at=now - timedelta(days=6),
        resolved_at=now - timedelta(days=5, hours=22),
        technician_notes="[RESOLVED]: Refilled semi-synthetic coolant reservoir to 85% mark. Thermals normalized to 10.4 K delta. Passed 30-min run test.",
    )
    db.add(alert_res1)

    # 6. Resolved Alert for MCH-0005
    alert_res2 = Alert(
        machine_id="MCH-0005",
        level="High Risk",
        message="Excessive torque peak detected on extruder screw drive.",
        failure_mode="Overstrain Failure (OSF)",
        probability=64.2,
        top_factors=json.dumps([
            {"feature": "Torque [Nm]", "importance": 0.48, "direction": "increases_risk", "human_text": "Screw backpressure torque spiked to 68 Nm."},
        ]),
        recommended_actions=json.dumps(["Purge cylinder and inspect heater band zone 3."]),
        status="Resolved",
        created_at=now - timedelta(days=12),
        resolved_at=now - timedelta(days=11, hours=18),
        technician_notes="[RESOLVED]: Replaced faulty ceramic heater band on barrel zone 3. Melt viscosity returned to spec.",
    )
    db.add(alert_res2)

    # Seed Maintenance Records (Kanban tasks)
    tasks = [
        MaintenanceRecord(
            machine_id="MCH-0002",
            title="Emergency Tool Insert Replacement & Spindle Runout Check",
            description="Replace blunted milling inserts following High Risk TWF alert. Check spindle taper zero runout.",
            priority="Critical",
            status="In Progress",
            due_date=now + timedelta(hours=8),
            assigned_technician="Alex Chen",
            cost_estimate=320.0,
            created_at=now - timedelta(hours=3),
        ),
        MaintenanceRecord(
            machine_id="MCH-0008",
            title="Inverter Drive Diagnostics & VFD Bus Test",
            description="Diagnose high-power surge (11.6 kW). Test DC bus capacitor bank and motor insulation resistance.",
            priority="High",
            status="Pending",
            due_date=now + timedelta(hours=20),
            assigned_technician="Sarah Miller",
            cost_estimate=850.0,
            created_at=now - timedelta(hours=5),
        ),
        MaintenanceRecord(
            machine_id="MCH-0007",
            title="Coolant System Flush & Radiator Shroud Cleaning",
            description="Clear metal fines from coolant return pump and chemical flush heat exchanger cores.",
            priority="Medium",
            status="Pending",
            due_date=now + timedelta(days=3),
            assigned_technician="Devon Vance",
            cost_estimate=240.0,
            created_at=now - timedelta(hours=8),
        ),
        MaintenanceRecord(
            machine_id="MCH-0004",
            title="Press Hydraulic Die Guide Bushing Inspection",
            description="Inspect mechanical guides for axial play or scoring. Re-grease high-load bronze bushings.",
            priority="Medium",
            status="In Progress",
            due_date=now + timedelta(days=2),
            assigned_technician="Alex Chen",
            cost_estimate=450.0,
            created_at=now - timedelta(hours=14),
        ),
        MaintenanceRecord(
            machine_id="MCH-0001",
            title="Monthly 200-Hour Preventive Lubrication",
            description="Standard 30-day lubrication service: linear guide rails, ball screw recirculating nuts, spindle chiller.",
            priority="Routine",
            status="Completed",
            due_date=now - timedelta(days=5),
            completed_at=now - timedelta(days=5, hours=3),
            assigned_technician="Sarah Miller",
            technician_notes="Completed full ISO VG 68 slide lubrication. All rail wipers clean.",
            cost_estimate=180.0,
            created_at=now - timedelta(days=7),
        ),
        MaintenanceRecord(
            machine_id="MCH-0005",
            title="Heater Band Replacement Zone 3",
            description="Installed new 1200W mica insulated band heater on barrel zone 3.",
            priority="High",
            status="Completed",
            due_date=now - timedelta(days=11),
            completed_at=now - timedelta(days=11, hours=16),
            assigned_technician="Devon Vance",
            technician_notes="Replaced wiring harness and thermocouple J-type. Heat up test verified stable at 240 C.",
            cost_estimate=380.0,
            created_at=now - timedelta(days=12),
        ),
    ]

    for t in tasks:
        db.add(t)

    db.commit()
    db.close()
    print("[OK] Successfully seeded database with 10 machines, 250 readings, 6 alerts, and 6 maintenance tasks.")


if __name__ == "__main__":
    seed_database()
