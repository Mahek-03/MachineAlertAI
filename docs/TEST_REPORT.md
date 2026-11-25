# MachineAlert AI – Test & Verification Report

**Verification Date:** November 2026  
**Environment:** Python 3.12 / 3.13, Node.js 22, Pytest 9.1, Vitest 2.1  
**Project:** College Mini Project – Practical No. 07 (Predictive Maintenance)

---

## 1. Test Suite Summary Table

| Test Suite | Framework / Tool | Scope | Target Floor / SLA | Status | Result Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ML Performance Floors** | Python (`evaluate.py`) | Holdout Test Set (1,500 samples) | Acc $\ge 94\%$, Recall $\ge 75\%$, PR-AUC $\ge 0.70$ | **PASS** | **Acc: 97.93%, Recall: 90.20%, PR-AUC: 0.9094** |
| **Backend REST API** | Pytest + Starlette TestClient | Endpoints, DB CRUD, Workflows | 100% Pass Rate | **PASS** | **10 / 10 Tests Passed** |
| **Inference Latency SLA** | Python `time.perf_counter()` | Single Telemetry Inference | Latency $< 300\text{ ms}$ | **PASS** | **Roundtrip Latency: 14.8 ms** |
| **Frontend UI Components** | Vitest + React Testing Library | Badges, RUL Bar, Gauges | 100% Pass Rate | **PASS** | **4 / 4 Tests Passed (215ms)** |
| **Automated Smoke Test** | PowerShell / Bash Shell | Live API Health, Predict, DB | Zero Non-200 Responses | **PASS** | **5 / 5 Stages Verified** |

---

## 2. Machine Learning Reliability Floors (`ml/src/evaluate.py`)

Execution on unseen holdout test split ($1,500$ cycles, $51$ failures):

```
=======================================================
 MACHINEALERT AI: HOLDOUT TEST SET VERIFICATION REPORT
=======================================================
Model:                Gradient Boosting Classifier
Optimal Threshold:    0.290
Test Set Samples:     1500 (Failures: 51)
Accuracy:             97.93%
Recall:               90.20% (Safety Critical)
Precision:            63.89%
F1-Score:             0.7480
ROC-AUC:              0.9838
PR-AUC:               0.9094

Confusion Matrix:
  TN: 1423  | FP: 26
  FN: 5     | TP: 46

Performance Floor Checklist:
  [PASS] Accuracy >= 94% (Achieved: 97.93%)
  [PASS] Recall >= 75%   (Achieved: 90.20%)
  [PASS] PR-AUC >= 0.70  (Achieved: 0.9094)
  [PASS] ROC-AUC >= 0.90 (Achieved: 0.9838)
```

---

## 3. Backend REST API Test Suite (`backend/tests/test_api.py`)

Run output from `pytest tests/test_api.py -v`:
```
tests/test_api.py::test_health_endpoints PASSED                          [ 10%]
tests/test_api.py::test_model_info PASSED                                [ 20%]
tests/test_api.py::test_predict_nominal PASSED                           [ 30%]
tests/test_api.py::test_predict_critical_failure PASSED                  [ 40%]
tests/test_api.py::test_prediction_latency_under_300ms PASSED            [ 50%]
tests/test_api.py::test_machines_crud_and_lifecycle PASSED               [ 60%]
tests/test_api.py::test_alerts_workflow PASSED                           [ 70%]
tests/test_api.py::test_maintenance_workflow PASSED                      [ 80%]
tests/test_api.py::test_dashboard_summary PASSED                         [ 90%]
tests/test_api.py::test_simulator_single_cycle PASSED                    [100%]

====================== 10 passed in 19.83s =======================
```

### Coverage Highlights:
- **`test_health_endpoints`:** Validates root `/health` and `/api/v1/health` probes.
- **`test_model_info`:** Confirms runtime model metadata, optimal threshold ($0.290$), and accuracy metrics are exposed.
- **`test_predict_nominal`:** Confirms safe inputs produce `Normal` risk badge and $P < 30\%$.
- **`test_predict_critical_failure`:** Confirms high torque ($68\text{ Nm}$) and worn tool ($230\text{ min}$) trigger `High Risk` and failure actions.
- **`test_prediction_latency_under_300ms`:** Benchmarks inference speed ($14.8\text{ ms} < 300\text{ ms}$).
- **`test_machines_crud_and_lifecycle`:** Validates registration, retrieval, telemetry log updates, and deletion.
- **`test_alerts_workflow`:** Validates technician acknowledgment and resolution notes flow.
- **`test_maintenance_workflow`:** Validates work order dispatch and transition to `Completed`.
- **`test_dashboard_summary`:** Confirms aggregated statistics match database state.
- **`test_simulator_single_cycle`:** Validates synthetic fault injection.

---

## 4. Frontend Unit Test Suite (`frontend/src/tests/components.test.tsx`)

Run output from `npm run test`:
```
 ✓ src/tests/components.test.tsx (4 tests) 215ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
   Start at  19:48:49
   Duration  11.33s
```

### Coverage Highlights:
- **`RiskBadge`:** Semantic color verification for Normal (emerald), Medium Risk (amber), and High Risk (red).
- **`StatusBadge`:** Status text and pill color rendering for Operational, Degraded, and Maintenance Required.
- **`RulBar`:** Remaining minutes and operational hour calculations.
- **`GaugeMeter`:** Sensor label, numerical readout, physical units, and warning/critical threshold transitions.

---

## 5. Automated Smoke Test Script (`scripts/smoke_test.ps1`)

Automated end-to-end smoke verification executed against the live API:
```
[1/5] Testing /health endpoint... PASS (Healthy)
[2/5] Testing /api/v1/model/info... PASS (Accuracy: 97.93%)
[3/5] Testing /api/v1/predict with nominal telemetry... PASS (Risk: Normal, 4.2%)
[4/5] Testing /api/v1/predict with critical wear... PASS (Alert Triggered: High Risk, 88.5%)
[5/5] Testing /api/v1/machines listing... PASS (10 assets registered)
==========================================================
 All API Smoke Tests PASSED successfully!
==========================================================
```
