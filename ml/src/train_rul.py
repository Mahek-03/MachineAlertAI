"""
Remaining Useful Life (RUL) Regression Pipeline for MachineAlert AI.
Trains and compares Linear Regression, Random Forest Regressor, and Gradient Boosting.
Predicts remaining operational minutes before mandatory tool change or failure.
"""
import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler

from features import engineer_features, get_feature_names

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
BACKEND_ARTIFACTS_DIR = os.path.join(os.path.dirname(BASE_DIR), "backend", "app", "artifacts")


def train_rul_model():
    """Train and evaluate RUL regression models on unaugmented telemetry."""
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    os.makedirs(BACKEND_ARTIFACTS_DIR, exist_ok=True)

    # Load raw data and preprocess specifically for RUL regression
    from preprocess import load_and_preprocess_raw_data
    from sklearn.model_selection import train_test_split

    df = load_and_preprocess_raw_data()
    feature_cols = get_feature_names()

    X = df[feature_cols]
    y_rul = df["RUL"].values

    scaler_bundle = joblib.load(os.path.join(ARTIFACTS_DIR, "scaler.joblib"))
    scaler: StandardScaler = scaler_bundle["scaler"]

    X_train_raw, X_temp, y_train, y_temp = train_test_split(
        X, y_rul, test_size=0.30, random_state=42
    )
    X_val_raw, X_test_raw, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=42
    )

    X_train = scaler.transform(X_train_raw)
    X_val = scaler.transform(X_val_raw)
    X_test = scaler.transform(X_test_raw)

    candidates = {
        "Ridge Regression": Ridge(alpha=1.0),
        "Random Forest Regressor": RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
        "Gradient Boosting Regressor": GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42),
    }

    best_name = None
    best_rmse = float("inf")
    best_model = None
    results = {}

    print("\n--- Training RUL Regression Models ---")
    for name, reg in candidates.items():
        reg.fit(X_train, y_train)
        val_preds = np.clip(reg.predict(X_val), 0.0, 240.0)

        mae = mean_absolute_error(y_val, val_preds)
        rmse = np.sqrt(mean_squared_error(y_val, val_preds))
        r2 = r2_score(y_val, val_preds)

        results[name] = {"val_mae": float(mae), "val_rmse": float(rmse), "val_r2": float(r2)}
        print(f"[{name}] MAE: {mae:.2f} min | RMSE: {rmse:.2f} min | R²: {r2:.4f}")

        if rmse < best_rmse:
            best_rmse = rmse
            best_name = name
            best_model = reg

    # Final holdout evaluation
    test_preds = np.clip(best_model.predict(X_test), 0.0, 240.0)
    test_mae = float(mean_absolute_error(y_test, test_preds))
    test_rmse = float(np.sqrt(mean_squared_error(y_test, test_preds)))
    test_r2 = float(r2_score(y_test, test_preds))

    print(f"\n[WINNER] Selected {best_name} for RUL Prediction.")
    print(f"Test MAE:  {test_mae:.2f} minutes")
    print(f"Test RMSE: {test_rmse:.2f} minutes")
    print(f"Test R²:   {test_r2:.4f}")

    bundle = {
        "model": best_model,
        "model_name": best_name,
        "metrics": {"test_mae": round(test_mae, 2), "test_rmse": round(test_rmse, 2), "test_r2": round(test_r2, 4)},
        "feature_names": feature_cols,
    }

    joblib.dump(bundle, os.path.join(ARTIFACTS_DIR, "rul_model.joblib"))
    joblib.dump(bundle, os.path.join(BACKEND_ARTIFACTS_DIR, "rul_model.joblib"))
    print(f"[OK] Saved RUL model to artifacts.")

    return best_model, bundle["metrics"]


if __name__ == "__main__":
    train_rul_model()
