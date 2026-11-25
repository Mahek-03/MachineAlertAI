# MachineAlert AI – REST API Reference Specification

Base URL: `http://localhost:8000/api/v1`  
Interactive Swagger Documentation: `http://localhost:8000/docs`  
ReDoc Documentation: `http://localhost:8000/redoc`

---

## 1. Prediction Endpoints

### `POST /predict`
Run real-time predictive failure inference on single sensor reading. If `machine_id` is passed, automatically records the reading and generates an incident alert for elevated risk.

**Request Body:**
```json
{
  "machine_id": "MCH-0001",
  "air_temperature": 298.1,
  "process_temperature": 308.6,
  "rotational_speed": 1551,
  "torque": 42.8,
  "tool_wear": 15,
  "type": "M"
}
```

**Response (200 OK):**
```json
{
  "machine_id": "MCH-0001",
  "reading_id": 251,
  "failure_probability": 4.2,
  "risk_level": "Normal",
  "predicted_failure": 0,
  "failure_mode_hint": null,
  "remaining_useful_life": 224.8,
  "top_factors": [
    {
      "feature": "Torque [Nm]",
      "importance": -0.1542,
      "direction": "decreases_risk",
      "human_text": "Torque (42.8 Nm) is within safe operating range."
    },
    {
      "feature": "Tool wear [min]",
      "importance": -0.1284,
      "direction": "decreases_risk",
      "human_text": "Tool wear (15.0 min) is within normal wear profile."
    }
  ],
  "recommended_actions": [
    "Machine is operating within normal technical parameters.",
    "Continue standard preventive maintenance schedule (30-day inspection)."
  ],
  "timestamp": "2026-11-20T14:15:30.123456"
}
```

---

### `POST /predict/batch`
Upload multi-row CSV file (`multipart/form-data`) containing sensor records for bulk scoring.

**Response (200 OK):**
```json
{
  "total_rows": 6,
  "summary": {
    "normal_count": 4,
    "medium_risk_count": 1,
    "high_risk_count": 1,
    "failure_alert_count": 2
  },
  "records": [
    {
      "row_index": 1,
      "machine_id": "MCH-0001",
      "failure_probability": 4.2,
      "risk_level": "Normal",
      "predicted_failure": 0,
      "failure_mode_hint": null,
      "remaining_useful_life": 224.8,
      "top_factor": "Torque is within safe operating range."
    }
  ]
}
```

---

## 2. Asset Management Endpoints

### `GET /machines`
List registered machines with optional filtering.
- Query Parameters: `type` (L/M/H), `status`, `risk_level`, `search`.

### `POST /machines`
Register a new industrial machine asset. Auto-generates ID (`MCH-0011`) if omitted.

**Request Body:**
```json
{
  "name": "5-Axis CNC Milling Center Alpha",
  "type": "H",
  "location": "Bay A - Precision Machining",
  "status": "Operational"
}
```

### `GET /machines/{id}`
Fetch machine metadata and current operating status.

### `GET /machines/{id}/trend?limit=30`
Retrieve chronological time-series points (air temp, process temp, speed, torque, wear, probability, RUL).

### `GET /machines/{id}/compare`
Compute step-over-step rate of change deltas between current and previous reading.

---

## 3. Incident Alert Management

### `GET /alerts`
Retrieve alerts feed with filters: `machine_id`, `level` (High Risk / Medium Risk), `status` (Open / Acknowledged / Resolved).

### `PATCH /alerts/{id}/acknowledge`
Technician acknowledges open alert.
```json
{
  "notes": "Technician dispatched to inspect cooling lines."
}
```

### `PATCH /alerts/{id}/resolve`
Document resolution and close alert ticket.
```json
{
  "technician_notes": "Flushed cooling lines, replaced filter, tested 30 min run OK."
}
```

---

## 4. Maintenance Kanban Endpoints

### `GET /maintenance`
Retrieve work orders filtered by `status` (Pending / In Progress / Completed) or `priority`.

### `POST /maintenance`
Schedule a work order.
```json
{
  "machine_id": "MCH-0002",
  "title": "Emergency Tool Insert Replacement",
  "priority": "Critical",
  "due_date": "2026-11-21T08:00:00Z",
  "assigned_technician": "Alex Chen",
  "cost_estimate": 320.0
}
```

### `PATCH /maintenance/{id}`
Update status (`Pending` $\rightarrow$ `In Progress` $\rightarrow$ `Completed`) and append technician notes.

---

## 5. Dashboard, Health & Simulator Endpoints

### `GET /dashboard/summary`
Returns fleet-wide KPIs: total machines, risk counts, open alert count, average failure probability.

### `GET /health`
Probing health endpoint returning service and ML model loaded status.

### `GET /model/info`
Returns active model name, optimal decision threshold, accuracy, recall, PR-AUC, and confusion matrix.

### `POST /simulate/{machine_id}`
Triggers an operational duty cycle with optional fault injection:
- `inject_fault`: `null` (drift only), `"TWF"`, `"HDF"`, `"PWF"`, `"OSF"`, `"RANDOM"`.

### `POST /simulate/stream/start?interval=3.5`
Activates background asynchronous telemetry generator.

### `POST /simulate/stream/stop`
Pauses background generator.
