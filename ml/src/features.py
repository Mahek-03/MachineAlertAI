"""
Feature Engineering module for MachineAlert AI.
Computes domain-specific physical features from industrial sensor readings.
"""
import numpy as np
import pandas as pd


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute physics-informed and empirical features:
    1. temp_diff: Difference between process and ambient air temperature (Heat dissipation metric).
    2. temp_ratio: Ratio of process to ambient air temperature.
    3. power_w: Mechanical rotational power = Torque * angular_velocity (W).
    4. overstrain_proxy: Product of torque and accumulated tool wear.
    5. speed_torque_ratio: Speed over torque balance ratio.
    6. wear_rate_proxy: Tool wear scaled by rotational speed.
    """
    df = df.copy()

    # Temperature dynamics
    air_col = "Air temperature [K]"
    proc_col = "Process temperature [K]"
    speed_col = "Rotational speed [rpm]"
    torque_col = "Torque [Nm]"
    wear_col = "Tool wear [min]"

    if air_col in df.columns and proc_col in df.columns:
        df["temp_diff"] = df[proc_col] - df[air_col]
        df["temp_ratio"] = df[proc_col] / (df[air_col] + 1e-6)

    # Mechanical power in Watts: P = tau * omega = Torque * (rpm * 2 * pi / 60)
    if torque_col in df.columns and speed_col in df.columns:
        omega = df[speed_col] * (2.0 * np.pi / 60.0)
        df["power_w"] = df[torque_col] * omega
        df["speed_torque_ratio"] = df[speed_col] / (df[torque_col] + 1e-4)

    # Overstrain failure factor: Torque * Tool wear
    if torque_col in df.columns and wear_col in df.columns:
        df["overstrain_proxy"] = df[torque_col] * df[wear_col]

    # Tool wear intensity
    if wear_col in df.columns and speed_col in df.columns:
        df["wear_rate_proxy"] = df[wear_col] / (df[speed_col] / 1000.0 + 1e-4)

    # Tool wear stage flags
    if wear_col in df.columns:
        df["tool_wear_critical"] = (df[wear_col] >= 200).astype(int)

    return df


def get_feature_names() -> list[str]:
    """Returns the ordered list of numeric model features."""
    return [
        "Air temperature [K]",
        "Process temperature [K]",
        "Rotational speed [rpm]",
        "Torque [Nm]",
        "Tool wear [min]",
        "temp_diff",
        "temp_ratio",
        "power_w",
        "speed_torque_ratio",
        "overstrain_proxy",
        "wear_rate_proxy",
        "tool_wear_critical",
        "Type_H",
        "Type_L",
        "Type_M",
    ]
