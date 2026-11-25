"""
Explainability Module for MachineAlert AI using SHAP (SHapley Additive exPlanations).
Translates tree model feature attributions into actionable industrial insights.
"""
import os
import joblib
import numpy as np


class ModelExplainer:
    def __init__(self, classifier_path: str, scaler_path: str):
        self.clf_bundle = joblib.load(classifier_path)
        self.model = self.clf_bundle["model"]
        self.feature_names = self.clf_bundle["feature_names"]
        self.scaler_bundle = joblib.load(scaler_path)
        self.scaler = self.scaler_bundle["scaler"]
        self.tree_explainer = None

        try:
            import shap
            if hasattr(self.model, "estimators_") or "XGB" in str(type(self.model)):
                self.tree_explainer = shap.TreeExplainer(self.model)
        except Exception as e:
            print(f"[INFO] TreeExplainer not initialized: {e}")

    def explain(self, raw_features_dict: dict, scaled_row: np.ndarray) -> list[dict]:
        """
        Compute top positive contributing factors (risk drivers) for a given reading.
        Returns a list of factor dicts:
        [{ "feature": "Torque [Nm]", "impact": 0.32, "direction": "increases_risk", "human_text": "..." }]
        """
        factors = []
        shap_vals = None

        if self.tree_explainer is not None:
            try:
                values = self.tree_explainer.shap_values(scaled_row)
                # TreeExplainer for binary classification may return list of 2 arrays or 1 array
                if isinstance(values, list) and len(values) == 2:
                    shap_vals = values[1][0]
                elif isinstance(values, np.ndarray):
                    shap_vals = values[0] if values.ndim == 2 else values
            except Exception:
                shap_vals = None

        # Fallback to feature importance * scaled deviation if SHAP fails or unavailable
        if shap_vals is None:
            if hasattr(self.model, "feature_importances_"):
                imp = self.model.feature_importances_
                shap_vals = imp * scaled_row[0]
            else:
                shap_vals = scaled_row[0]

        # Pair features with their attribution values
        ranked = []
        for name, val in zip(self.feature_names, shap_vals):
            raw_val = raw_features_dict.get(name, None)
            ranked.append({
                "feature": name,
                "importance": float(val),
                "raw_value": raw_val,
            })

        # Sort by magnitude of contribution
        ranked.sort(key=lambda x: abs(x["importance"]), reverse=True)

        for item in ranked[:4]:
            feat = item["feature"]
            imp = item["importance"]
            raw_val = item["raw_value"]
            direction = "increases_risk" if imp > 0 else "decreases_risk"

            text = self._build_human_explanation(feat, raw_val, imp > 0)
            factors.append({
                "feature": feat,
                "importance": round(imp, 4),
                "direction": direction,
                "human_text": text,
            })

        return factors

    def _build_human_explanation(self, feature: str, val: float, is_risk_increase: bool) -> str:
        """Create intuitive operator-friendly explanations."""
        if val is not None:
            v_str = f" ({val:.1f})" if isinstance(val, (int, float)) else f" ({val})"
        else:
            v_str = ""

        if "Torque" in feature:
            return f"High torque{v_str} elevates mechanical strain on drive components." if is_risk_increase else f"Torque{v_str} is within safe operating range."
        elif "Tool wear" in feature:
            return f"Accumulated tool wear{v_str} is approaching critical endurance limit." if is_risk_increase else f"Tool wear{v_str} is within normal wear profile."
        elif "Rotational speed" in feature:
            return f"Rotational speed anomaly{v_str} detected." if is_risk_increase else f"Rotational speed{v_str} is stable."
        elif "temp_diff" in feature:
            return f"Low temperature differential{v_str} indicates inadequate heat dissipation." if is_risk_increase else f"Heat dissipation rate{v_str} is optimal."
        elif "power_w" in feature:
            return f"Abnormal mechanical power consumption{v_str}." if is_risk_increase else f"Power consumption{v_str} is nominal."
        elif "overstrain" in feature:
            return f"Excessive torque-wear product ({v_str}) creates high overstrain risk." if is_risk_increase else f"Overstrain index is nominal."
        elif "Air temperature" in feature or "Process temperature" in feature:
            return f"Thermal sensor reading{v_str} deviating from nominal curve." if is_risk_increase else f"Thermal state{v_str} is stable."
        else:
            return f"Feature '{feature}'{v_str} significantly impacts the failure probability."
