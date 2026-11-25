"""
ML Inference Service for MachineAlert AI.
Loads persisted models, performs physics-based feature engineering,
executes failure probability estimation, RUL prediction, failure mode diagnosis,
and SHAP feature attribution.
"""
import json
import os
import sys
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

# Import explainability engine (self-contained in backend/app/ for Render cloud deployments)
try:
    from .explain import ModelExplainer
except ImportError:
    try:
        from app.explain import ModelExplainer
    except ImportError:
        sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ml", "src"))
        try:
            from explain import ModelExplainer
        except ImportError:
            ModelExplainer = None

from .config import settings
from .schemas import PredictionRequest, PredictionResponse, TopFactor


class MLService:
    def __init__(self):
        self.classifier = None
        self.rul_model = None
        self.scaler = None
        self.feature_names = []
        self.threshold = 0.30
        self.metrics = {}
        self.explainer = None
        self.is_loaded = False
        self._load_artifacts()

    def _load_artifacts(self):
        """Load trained model weights, scaler, and configuration."""
        try:
            # Scaler
            if os.path.exists(settings.SCALER_PATH):
                scaler_bundle = joblib.load(settings.SCALER_PATH)
                self.scaler = scaler_bundle["scaler"]
                self.feature_names = scaler_bundle["feature_names"]

            # Classifier
            if os.path.exists(settings.CLASSIFIER_PATH):
                clf_bundle = joblib.load(settings.CLASSIFIER_PATH)
                self.classifier = clf_bundle["model"]
                self.threshold = float(clf_bundle.get("threshold", 0.30))
                if not self.feature_names:
                    self.feature_names = clf_bundle.get("feature_names", [])

            # RUL Regressor
            if os.path.exists(settings.RUL_MODEL_PATH):
                rul_bundle = joblib.load(settings.RUL_MODEL_PATH)
                self.rul_model = rul_bundle["model"]

            # Metrics
            if os.path.exists(settings.METRICS_PATH):
                with open(settings.METRICS_PATH, "r") as f:
                    self.metrics = json.load(f)

            # Explainer
            if os.path.exists(settings.CLASSIFIER_PATH) and os.path.exists(settings.SCALER_PATH):
                try:
                    if ModelExplainer is not None:
                        self.explainer = ModelExplainer(settings.CLASSIFIER_PATH, settings.SCALER_PATH)
                except Exception as e:
                    print(f"[WARN] Explainer initialization note: {e}")

            self.is_loaded = (self.classifier is not None and self.scaler is not None)
            print(f"[OK] MLService loaded: classifier={type(self.classifier).__name__}, threshold={self.threshold:.3f}")
        except Exception as e:
            print(f"[ERROR] Failed to load ML artifacts: {e}")
            self.is_loaded = False

    def transform_features(self, req: PredictionRequest) -> tuple[np.ndarray, dict]:
        """Convert input request into engineered feature matrix matching training schema."""
        air_t = req.air_temperature
        proc_t = req.process_temperature
        speed = req.rotational_speed
        torque = req.torque
        wear = req.tool_wear
        m_type = req.type.upper()

        # Physical feature engineering
        temp_diff = proc_t - air_t
        temp_ratio = proc_t / (air_t + 1e-6)
        omega = speed * (2.0 * np.pi / 60.0)
        power_w = torque * omega
        speed_torque_ratio = speed / (torque + 1e-4)
        overstrain_proxy = torque * wear
        wear_rate_proxy = wear / (speed / 1000.0 + 1e-4)
        tool_wear_critical = 1.0 if wear >= 200 else 0.0

        raw_dict = {
            "Air temperature [K]": air_t,
            "Process temperature [K]": proc_t,
            "Rotational speed [rpm]": float(speed),
            "Torque [Nm]": torque,
            "Tool wear [min]": float(wear),
            "temp_diff": temp_diff,
            "temp_ratio": temp_ratio,
            "power_w": power_w,
            "speed_torque_ratio": speed_torque_ratio,
            "overstrain_proxy": overstrain_proxy,
            "wear_rate_proxy": wear_rate_proxy,
            "tool_wear_critical": tool_wear_critical,
            "Type_H": 1.0 if m_type == "H" else 0.0,
            "Type_L": 1.0 if m_type == "L" else 0.0,
            "Type_M": 1.0 if m_type == "M" else 0.0,
        }

        # Build ordered vector
        vector = [raw_dict[name] for name in self.feature_names]
        feature_matrix = np.array([vector], dtype=np.float32)

        # Scale using StandardScaler
        scaled_matrix = self.scaler.transform(feature_matrix)
        return scaled_matrix, raw_dict

    def diagnose_failure_mode(self, raw_dict: dict) -> tuple[str, list[str]]:
        """
        Pinpoints the specific failure pattern according to AI4I physics definitions
        and provides targeted maintenance actions.
        """
        temp_diff = raw_dict["temp_diff"]
        speed = raw_dict["Rotational speed [rpm]"]
        power_w = raw_dict["power_w"]
        overstrain = raw_dict["overstrain_proxy"]
        wear = raw_dict["Tool wear [min]"]
        is_type_l = raw_dict["Type_L"] == 1.0
        is_type_m = raw_dict["Type_M"] == 1.0

        limit = 11000 if is_type_l else (12000 if is_type_m else 13000)

        # 1. Heat Dissipation Failure (HDF)
        if temp_diff < 8.6 and speed < 1380:
            mode = "Heat Dissipation Failure (HDF)"
            actions = [
                "Inspect heat exchanger and clear coolant filtration channels.",
                "Verify coolant flow rate and pump discharge pressure.",
                "Check spindle thermal sensor calibration and cooling airflow."
            ]
            return mode, actions

        # 2. Power Failure (PWF)
        if power_w < 3500 or power_w > 9000:
            mode = "Power Failure (PWF)"
            actions = [
                "Inspect spindle motor drive inverter and test for phase imbalance.",
                "Verify main line voltage regulation and ground connections.",
                "Check drive belt tension and motor bearing drag."
            ]
            return mode, actions

        # 3. Overstrain Failure (OSF)
        if overstrain > limit:
            mode = "Overstrain Failure (OSF)"
            actions = [
                "Reduce CNC feed rate and depth of cut to decrease cutting resistance.",
                "Inspect tool holder for excessive runout and vibration.",
                "Check workpiece clamping rigidity and tool engagement angles."
            ]
            return mode, actions

        # 4. Tool Wear Failure (TWF)
        if wear >= 200:
            mode = "Tool Wear Failure (TWF)"
            actions = [
                "Replace cutting insert / end mill immediately (nearing 240 min endurance limit).",
                "Inspect machined surface finish for chatter marks or burrs.",
                "Reset digital tool wear counter after replacement."
            ]
            return mode, actions

        # 5. Potential Multi-Factor or Generic
        return "General Mechanical Anomaly", [
            "Conduct visual and vibration inspection of the spindle unit.",
            "Verify lubrication pressure and oil viscosity.",
            "Review operational telemetry history for abnormal duty cycles."
        ]

    def predict(self, req: PredictionRequest) -> PredictionResponse:
        """Run end-to-end inference for a single machine telemetry reading."""
        if not self.is_loaded:
            self._load_artifacts()

        scaled_matrix, raw_dict = self.transform_features(req)

        # 1. Classification & Failure Probability
        if hasattr(self.classifier, "predict_proba"):
            prob_float = float(self.classifier.predict_proba(scaled_matrix)[0, 1])
        else:
            prob_float = float(self.classifier.decision_function(scaled_matrix)[0])
            prob_float = 1.0 / (1.0 + np.exp(-prob_float))

        probability_pct = round(prob_float * 100.0, 1)

        # 2. Risk Level Assignment
        if probability_pct < settings.THRESHOLD_NORMAL_MAX:
            risk_level = "Normal"
        elif probability_pct < settings.THRESHOLD_MEDIUM_MAX:
            risk_level = "Medium Risk"
        else:
            risk_level = "High Risk"

        predicted_failure = 1 if prob_float >= self.threshold else 0

        # 3. Remaining Useful Life (RUL)
        if self.rul_model is not None:
            rul_raw = float(self.rul_model.predict(scaled_matrix)[0])
            # Adjust RUL by failure probability
            rul_val = max(0.0, min(240.0, rul_raw * (1.0 - (prob_float ** 1.5))))
        else:
            wear = req.tool_wear
            base_rul = max(0.0, 240.0 - wear)
            rul_val = max(0.0, base_rul * (1.0 - prob_float))

        # 4. Failure Mode & Actions
        failure_mode, recommended_actions = self.diagnose_failure_mode(raw_dict)
        if risk_level == "Normal":
            failure_mode = None
            recommended_actions = [
                "Machine is operating within normal technical parameters.",
                "Continue standard preventive maintenance schedule (30-day inspection)."
            ]

        # 5. Explainability (SHAP Top Factors)
        top_factors = []
        if self.explainer is not None:
            factors_data = self.explainer.explain(raw_dict, scaled_matrix)
            top_factors = [TopFactor(**f) for f in factors_data]
        else:
            # Fallback factors
            top_factors = [
                TopFactor(
                    feature="Torque [Nm]",
                    importance=0.28,
                    direction="increases_risk" if req.torque > 50 else "decreases_risk",
                    human_text=f"Torque ({req.torque} Nm) impacts drive load.",
                ),
                TopFactor(
                    feature="Tool wear [min]",
                    importance=0.25,
                    direction="increases_risk" if req.tool_wear > 180 else "decreases_risk",
                    human_text=f"Tool wear ({req.tool_wear} min) accumulated.",
                ),
                TopFactor(
                    feature="Rotational speed [rpm]",
                    importance=0.20,
                    direction="increases_risk" if req.rotational_speed < 1350 else "decreases_risk",
                    human_text=f"Rotational speed at {req.rotational_speed} RPM.",
                ),
            ]

        return PredictionResponse(
            machine_id=req.machine_id,
            reading_id=None,
            failure_probability=probability_pct,
            risk_level=risk_level,
            predicted_failure=predicted_failure,
            failure_mode_hint=failure_mode,
            remaining_useful_life=round(rul_val, 1),
            top_factors=top_factors,
            recommended_actions=recommended_actions,
            timestamp=datetime.utcnow(),
        )


ml_service = MLService()
