# MachineAlert AI – Requirements Traceability Matrix

This document maps all user and academic syllabus requirements (Sections 1 through 8) to the implementing modules, components, and verification tests.

| Req ID | Requirement Description | Implementation Location | Verification Evidence / Test |
| :--- | :--- | :--- | :--- |
| **REQ-1.1** | UCI AI4I 2020 Predictive Maintenance Dataset ingestion | `ml/data/raw/ai4i2020.csv`<br>`ml/src/download_data.py` | Verified 10,000 rows loaded with exact 14 columns. |
| **REQ-1.2** | Fallback synthetic data generator adhering to documented failure rules | `ml/src/download_data.py::generate_synthetic_data` | Synthetic generator adheres to HDF, PWF, OSF, TWF rules. |
| **REQ-2.1** | Python ML stack (scikit-learn, XGBoost, SMOTE, SHAP, joblib) | `ml/src/preprocess.py`<br>`ml/src/train_classifier.py` | Models trained and persisted with joblib; SHAP tree explainer active. |
| **REQ-2.2** | FastAPI REST API with Pydantic schemas, SQLAlchemy, SQLite/PostgreSQL | `backend/app/main.py`<br>`backend/app/models.py`<br>`backend/app/schemas.py` | Complete ORM models with SQLite dev default; PostgreSQL ready. |
| **REQ-2.3** | React + Vite + TypeScript + Tailwind + Recharts frontend | `frontend/src/` | Built successfully in 29.72s with zero TypeScript errors. |
| **REQ-4.1** | Stratified split (70/15/15), SMOTE applied strictly on train fold | `ml/src/preprocess.py` | Train resampled $7,000 \rightarrow 9,130$; Test split un-augmented ($3.4\%$ failure rate). |
| **REQ-4.2** | Physics feature engineering (ΔT, Power W, Overstrain, wear rate) | `ml/src/features.py` | Engineered features verified in pipeline and API inference. |
| **REQ-4.3** | Supplementary image preprocessing module (64x64 heatmap, augment, CNN) | `ml/src/image_pipeline.py` | Generates 2D images, applies noise/roll/flip, and evaluates CNN benchmark. |
| **REQ-4.4** | Classification model selection optimizing Recall and PR-AUC | `ml/src/train_classifier.py` | Gradient Boosting selected: **Recall 90.20%, PR-AUC 0.9094, Accuracy 97.93%**. |
| **REQ-4.5** | Precision-Recall decision threshold tuning | `ml/src/train_classifier.py` | Optimal threshold calibrated to **0.290** (29.0%). |
| **REQ-4.6** | Derived Remaining Useful Life (RUL) regression model | `ml/src/train_rul.py` | Gradient Boosting Regressor: **MAE 1.59 min, $R^2$ 0.9970**. |
| **REQ-4.7** | SHAP feature attributions returning top 3 factors | `ml/src/explain.py`<br>`backend/app/ml_service.py` | Returns top 3 factors with human-readable operational explanations. |
| **REQ-4.8** | Multi-tier risk boundaries (Normal <30%, Medium 30-60%, High ≥60%) | `backend/app/config.py`<br>`frontend/src/pages/SettingsPage.tsx` | Enforced in inference, badge colors, and configurable in UI. |
| **REQ-5.1** | Prediction endpoints (`POST /predict` and batch CSV upload) | `backend/app/routers/predict.py` | Single inference (<300ms SLA) and bulk CSV file scoring. |
| **REQ-5.2** | Machines asset CRUD, readings log, trend, and delta compare | `backend/app/routers/machines.py` | Full asset registry, chronological trend series, and delta acceleration. |
| **REQ-5.3** | Incident alerts lifecycle (list, acknowledge, resolve with technician notes) | `backend/app/routers/alerts.py` | Tickets dispatch with top factors, recommended actions, and resolution logs. |
| **REQ-5.4** | Maintenance Kanban work order scheduling with auto-suggested due dates | `backend/app/routers/maintenance.py` | Due date auto-suggestions (High: 24h, Medium: 7d, Routine: 30d). |
| **REQ-5.5** | Telemetry simulator & background asynchronous streaming worker | `backend/app/routers/simulate.py` | Injects tool wear drift and on-demand fault conditions ('HDF', 'TWF', 'PWF', 'OSF'). |
| **REQ-5.6** | Demo database seed script with 10 machines and 3 weeks history | `backend/app/seed.py` | Seeds 10 machines, 250 readings, 6 alerts, and 6 maintenance tasks. |
| **REQ-6.1** | Industrial-tech aesthetic, dark navy sidebar, responsive design | `frontend/src/components/layout/` | Clean aesthetic inspired by modern industrial APM platforms. |
| **REQ-6.2** | 10 complete frontend pages (Landing, Dashboard, Machines, Detail, etc.) | `frontend/src/pages/` | All 10 pages fully implemented with zero mock stubs or placeholders. |
| **REQ-7.1** | Production Dockerfile (multi-stage) and `docker-compose.yml` | `backend/Dockerfile`<br>`frontend/Dockerfile`<br>`docker-compose.yml` | Multi-stage, non-root user, health check probes. |
| **REQ-7.2** | Cloud deployment guides (Cloud Run, Hosting, Render Blueprint) | `docs/DEPLOY.md`<br>`render.yaml` | Complete instructions and configuration for Google Cloud and Render. |
| **REQ-8.1** | Comprehensive testing (Pytest API, Vitest UI, Smoke test, SLA <300ms) | `backend/tests/test_api.py`<br>`frontend/src/tests/components.test.tsx`<br>`scripts/smoke_test.ps1` | All 10 Pytest tests passed; 4 Vitest UI tests passed; latency 14.8ms. |
| **REQ-8.2** | Full project documentation suite | `docs/` & `README.md` | ARCHITECTURE, ML_REPORT, API, DEPLOY, USER_GUIDE, TEST_REPORT. |
