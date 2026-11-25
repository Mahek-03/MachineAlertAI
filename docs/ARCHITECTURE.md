# MachineAlert AI – System Architecture & Technical Specification

## 1. Executive Summary & Purpose
**MachineAlert AI** is an industrial predictive maintenance system engineered to ingest continuous sensor telemetry from production machinery (CNC milling centers, heavy lathes, hydraulic stamping presses, and injection molding units), detect precursor degradation patterns, quantify failure probabilities, estimate Remaining Useful Life (RUL), and automatically dispatch maintenance work orders before catastrophic downtime occurs.

Developed to satisfy the academic requirements of **College Mini Project (Practical No. 07)**, this system combines physics-informed feature transformations, machine learning ensembles (Gradient Boosting, Random Forest, XGBoost), SHAP (SHapley Additive exPlanations), a FastAPI REST backend, and a modern industrial-tech React/Vite dashboard.

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph SENSORS ["Industrial Telemetry Sources (UCI AI4I 2020)"]
        S1["Air Temperature [K]"]
        S2["Process Temperature [K]"]
        S3["Spindle Speed [rpm]"]
        S4["Mechanical Torque [Nm]"]
        S5["Tool Wear [min]"]
        S6["Machine Quality Variant (L / M / H)"]
    end

    subgraph BACKEND ["FastAPI REST API Engine (:8000)"]
        INGEST["API Router /predict & /simulate"]
        
        subgraph FEAT_ENG ["Physics Feature Engineering"]
            F1["Temp Delta: ΔT = Proc - Air"]
            F2["Mechanical Power: P = τ · ω (Watts)"]
            F3["Overstrain Index: τ · Tool_Wear"]
            F4["Tool Wear Critical Indicator"]
            F5["One-Hot Quality Encoding (Type_H/L/M)"]
        end

        SCALER["StandardScaler (scaler.joblib)"]
        
        subgraph MODELS ["Trained ML Inference Layer"]
            GB["Gradient Boosting Classifier\n(Threshold: 0.290, Recall: 90.2%)"]
            RUL["Gradient Boosting Regressor\n(RUL in Minutes, R²: 0.997)"]
            SHAP["SHAP TreeExplainer\n(Top 3 Risk Factors)"]
            DIAG["Rule-Based Failure Mode Diagnoser\n(TWF, HDF, PWF, OSF)"]
        end

        DB[("SQLite / PostgreSQL Database\n(SQLAlchemy ORM)")]
        DISPATCH["Alert & Kanban Dispatch Engine"]
    end

    subgraph FRONTEND ["React 18 + Vite + Tailwind Dashboard (:5173)"]
        DASH["Fleet Health Dashboard (KPIs & Charts)"]
        INSP["Deep-Dive Machine Telemetry & RUL Gauges"]
        WHATIF["Interactive What-If & Batch CSV Scorer"]
        ALERTS["Incident Alert Triage & Resolution"]
        KANBAN["Maintenance Kanban Work Orders"]
        ANALYTICS["Fleet-wide Comparative Analytics"]
        MODEL_INFO["ML Performance & Academic Report"]
    end

    SENSORS --> INGEST
    INGEST --> FEAT_ENG
    FEAT_ENG --> SCALER
    SCALER --> MODELS
    MODELS --> DISPATCH
    DISPATCH --> DB
    DB <--> INGEST
    INGEST <--> FRONTEND
```

---

## 3. Physics-Informed Feature Transformations

Standard raw telemetry features often fail to expose non-linear failure modes. MachineAlert AI computes four primary derived physical attributes prior to model inference:

1. **Temperature Differential ($\Delta T$):**
   $$\Delta T = T_{\text{process}} - T_{\text{air}}$$
   *Physical Significance:* Measures cooling efficiency. A thermal differential drop below $8.6\text{ K}$ combined with low rotational speed ($<1380\text{ rpm}$) directly indicates Heat Dissipation Failure (HDF).

2. **Mechanical Power ($P_{\text{mech}}$ in Watts):**
   $$P_{\text{mech}} = \tau \times \left( \text{rpm} \times \frac{2\pi}{60} \right)$$
   *Physical Significance:* Monitors electrical drive power. Normal motor operation falls between $3,500\text{ W}$ and $9,000\text{ W}$. Readings outside this window signal Power Failure (PWF).

3. **Overstrain Index ($I_{\text{overstrain}}$):**
   $$I_{\text{overstrain}} = \tau \times \text{Tool Wear [min]}$$
   *Physical Significance:* Measures accumulated fatigue stress on workpiece clamping and spindle bearings. Exceeding threshold limits ($11,000\text{ Nm}\cdot\text{min}$ for Type L, $12,000$ for Type M, $13,000$ for Type H) triggers Overstrain Failure (OSF).

4. **Tool Wear Critical Boundary Flag:**
   $$\text{Flag}_{\text{wear}} = \mathbb{I}(\text{Tool Wear} \ge 200\text{ min})$$
   *Physical Significance:* Flags cutting inserts operating within the known replacement window ($200 - 240\text{ min}$) before edge chipping occurs.

---

## 4. Multi-Tier Risk Classification & Decision Policy

Rather than treating failure as a binary flip at 50%, MachineAlert AI applies a three-tiered risk envelope calibrated to operational safety:

| Risk Tier | Probability Range | UI Visual Badge | Automatic Response Policy |
| :--- | :--- | :--- | :--- |
| **Normal** | $0.0\% \le P < 30.0\%$ | **Emerald Green** | Machine operates normally. Routine 30-day preventive maintenance. |
| **Medium Risk** | $30.0\% \le P < 60.0\%$ | **Amber Warning** | Precursor warning. Dispatches inspection work order due within 7 days. |
| **High Risk** | $P \ge 60.0\%$ | **Red Critical** | Critical hazard. Auto-creates emergency work order due within 24 hours. |

*Note:* The decision threshold for binary `predicted_failure` is tuned via Precision-Recall analysis to **0.290** (29.0%), ensuring high recall ($90.2\%$) for safety-critical industrial operations.

---

## 5. Database Schema & Data Models

The persistence layer uses SQLAlchemy ORM and supports SQLite (local dev) and PostgreSQL (production cloud).

```mermaid
erDiagram
    MACHINES ||--o{ SENSOR_READINGS : records
    MACHINES ||--o{ ALERTS : generates
    MACHINES ||--o{ MAINTENANCE_RECORDS : schedules

    MACHINES {
        string id PK "e.g. MCH-0001"
        string name "Asset description"
        string type "L / M / H"
        string location "Factory Bay"
        datetime installation_date
        string status "Operational / Degraded / Maintenance Required"
        string latest_risk_level
        float latest_probability
        datetime created_at
        datetime updated_at
    }

    SENSOR_READINGS {
        int id PK
        string machine_id FK
        float air_temperature
        float process_temperature
        int rotational_speed
        float torque
        int tool_wear
        string type
        float failure_probability
        int predicted_failure
        string risk_level
        string predicted_mode
        float remaining_useful_life
        datetime timestamp
    }

    ALERTS {
        int id PK
        string machine_id FK
        string level "Medium Risk / High Risk"
        string message
        string failure_mode
        float probability
        text top_factors "JSON string"
        text recommended_actions "JSON string"
        string status "Open / Acknowledged / Resolved"
        datetime created_at
        datetime resolved_at
        text technician_notes
    }

    MAINTENANCE_RECORDS {
        int id PK
        string machine_id FK
        string title
        text description
        string priority "Critical / High / Medium / Routine"
        string status "Pending / In Progress / Completed"
        datetime due_date
        datetime completed_at
        string assigned_technician
        text technician_notes
        float cost_estimate
        datetime created_at
    }
```

---

## 6. Software Design Principles
1. **Separation of Concerns:** ML training (`ml/src`), inference orchestration (`backend/app/ml_service.py`), REST API routing (`backend/app/routers`), and user interface (`frontend/src`) are completely modular.
2. **Determinism & Reproducibility:** Fixed random seeds (`42`), stratified train/val/test splits, persisted StandardScaler, and tracked metric floor tests.
3. **Low Latency SLA:** Telemetry inference roundtrip executes in `< 25ms` (well below the $300\text{ ms}$ SLA requirement).
4. **Honest Academic Disclosures:** Transparent separation between primary production tabular models and supplementary image-based CNN experiments.
