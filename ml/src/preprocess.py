"""
Data Preprocessing and Splitting Pipeline for MachineAlert AI.
Handles feature scaling, encoding, train/val/test splitting, and imbalance treatment (SMOTE).
"""
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from features import engineer_features, get_feature_names

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DATA_PATH = os.path.join(BASE_DIR, "data", "raw", "ai4i2020.csv")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "data", "processed")
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
BACKEND_ARTIFACTS_DIR = os.path.join(os.path.dirname(BASE_DIR), "backend", "app", "artifacts")


def load_and_preprocess_raw_data() -> pd.DataFrame:
    """Load raw dataset and apply initial cleaning and feature engineering."""
    df = pd.read_csv(RAW_DATA_PATH)
    # Validate expected columns
    expected_cols = [
        "Air temperature [K]", "Process temperature [K]",
        "Rotational speed [rpm]", "Torque [Nm]", "Tool wear [min]", "Type"
    ]
    for c in expected_cols:
        if c not in df.columns:
            raise ValueError(f"Missing expected column '{c}' in raw data.")

    # One-hot encode Type column
    df = pd.get_dummies(df, columns=["Type"], prefix="Type", dtype=float)
    for t_col in ["Type_H", "Type_L", "Type_M"]:
        if t_col not in df.columns:
            df[t_col] = 0.0

    # Engineer physical domain features
    df = engineer_features(df)

    # Calculate derived Remaining Useful Life (RUL) target
    # Tool wear limit documented between 200-240 min in AI4I
    wear = df["Tool wear [min]"].clip(0, 240)
    base_rul = 240.0 - wear
    # If machine failure happened, RUL drops to 0 or near 0
    failure = df["Machine failure"]
    rul = np.where(failure == 1, np.random.uniform(0.0, 5.0, size=len(df)), base_rul)
    df["RUL"] = np.round(np.clip(rul, 0.0, 240.0), 1)

    return df


def split_and_scale_data(test_size: float = 0.15, val_size: float = 0.15, random_state: int = 42):
    """
    Split data into Train (70%), Validation (15%), and Test (15%) splits.
    Fit StandardScaler ONLY on training features.
    Apply SMOTE to training data if available.
    """
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    os.makedirs(BACKEND_ARTIFACTS_DIR, exist_ok=True)

    df = load_and_preprocess_raw_data()
    feature_cols = get_feature_names()

    X = df[feature_cols]
    y = df["Machine failure"]
    y_modes = df[["TWF", "HDF", "PWF", "OSF", "RNF"]] if "TWF" in df.columns else None
    y_rul = df["RUL"]

    # First split: train+val vs test (85% / 15%)
    X_temp, X_test, y_temp, y_test, rul_temp, rul_test = train_test_split(
        X, y, y_rul, test_size=test_size, stratify=y, random_state=random_state
    )

    # Second split: train vs val (70% / 15% of total -> 15/85 = ~0.1765)
    val_ratio = val_size / (1.0 - test_size)
    X_train, X_val, y_train, y_val, rul_train, rul_val = train_test_split(
        X_temp, y_temp, rul_temp, test_size=val_ratio, stratify=y_temp, random_state=random_state
    )

    print(f"Data split sizes: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")
    print(f"Train failure rate: {y_train.mean():.4f}, Test failure rate: {y_test.mean():.4f}")

    # Fit scaler on X_train only
    scaler = StandardScaler()
    scaler.fit(X_train)

    # Save scaler
    scaler_path = os.path.join(ARTIFACTS_DIR, "scaler.joblib")
    joblib.dump({"scaler": scaler, "feature_names": feature_cols}, scaler_path)
    joblib.dump({"scaler": scaler, "feature_names": feature_cols}, os.path.join(BACKEND_ARTIFACTS_DIR, "scaler.joblib"))
    print(f"[OK] Saved scaler to {scaler_path}")

    # SMOTE on training set only
    X_train_res = X_train.copy()
    y_train_res = y_train.copy()
    rul_train_res = rul_train.copy()

    try:
        from imblearn.over_sampling import SMOTE
        smote = SMOTE(random_state=random_state, sampling_strategy=0.35)
        X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
        print(f"[OK] Applied SMOTE on training set: {len(X_train)} -> {len(X_train_res)} samples (failures: {y_train_res.sum()})")
    except Exception as e:
        print(f"[INFO] SMOTE not applied ({e}). Using class weights during training.")

    # Save processed CSVs
    train_df = X_train_res.copy()
    train_df["Machine failure"] = y_train_res
    train_df["RUL"] = rul_train_res if len(rul_train_res) == len(train_df) else np.nan
    train_df.to_csv(os.path.join(PROCESSED_DATA_DIR, "train.csv"), index=False)

    val_df = X_val.copy()
    val_df["Machine failure"] = y_val
    val_df["RUL"] = rul_val
    val_df.to_csv(os.path.join(PROCESSED_DATA_DIR, "val.csv"), index=False)

    test_df = X_test.copy()
    test_df["Machine failure"] = y_test
    test_df["RUL"] = rul_test
    test_df.to_csv(os.path.join(PROCESSED_DATA_DIR, "test.csv"), index=False)

    print(f"[OK] Preprocessing completed. Processed datasets saved in {PROCESSED_DATA_DIR}")
    return X_train_res, y_train_res, X_val, y_val, X_test, y_test, scaler


if __name__ == "__main__":
    split_and_scale_data()
