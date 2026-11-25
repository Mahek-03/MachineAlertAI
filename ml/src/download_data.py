"""
Download and verify dataset script for MachineAlert AI.
UCI AI4I 2020 Predictive Maintenance Dataset.
Includes automatic fallback to synthetic generator matching documented failure rules.
"""
import os
import sys
import urllib.request
import zipfile
import numpy as np
import pandas as pd

RAW_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "raw")
RAW_DATA_FILE = os.path.join(RAW_DATA_DIR, "ai4i2020.csv")
UCI_URL = "https://archive.ics.uci.edu/static/public/601/ai4i+2020+predictive+maintenance+dataset.zip"


def generate_synthetic_data(num_samples: int = 10000) -> pd.DataFrame:
    """
    Generate synthetic dataset following the documented AI4I 2020 distribution and failure conditions:
    - TWF: Tool wear failure (tool wear between 200 and 240 min)
    - HDF: Heat dissipation failure (temp difference < 8.6 K and rotational speed < 1380 rpm)
    - PWF: Power failure (Power < 3500 W or > 9000 W where Power = Torque * Speed * 2pi/60)
    - OSF: Overstrain failure (Tool wear * Torque > threshold depending on Type L, M, H)
    - RNF: Random failure with 0.1% chance
    """
    np.random.seed(42)
    types = np.random.choice(["L", "M", "H"], size=num_samples, p=[0.60, 0.30, 0.10])
    air_temp = np.random.normal(loc=300.0, scale=2.0, size=num_samples)
    process_temp = air_temp + 10.0 + np.random.normal(loc=0.0, scale=1.0, size=num_samples)
    speed = np.random.normal(loc=1538.0, scale=179.0, size=num_samples).clip(1168, 2886)
    torque = np.random.normal(loc=40.0, scale=10.0, size=num_samples).clip(3.8, 76.6)
    tool_wear = np.random.uniform(0, 250, size=num_samples)

    twf = np.zeros(num_samples, dtype=int)
    hdf = np.zeros(num_samples, dtype=int)
    pwf = np.zeros(num_samples, dtype=int)
    osf = np.zeros(num_samples, dtype=int)
    rnf = np.zeros(num_samples, dtype=int)

    for i in range(num_samples):
        # TWF: tool wear between 200 and 240
        if 200 <= tool_wear[i] <= 240 and np.random.rand() < 0.25:
            twf[i] = 1

        # HDF: temp diff < 8.6 K and speed < 1380 rpm
        temp_diff = process_temp[i] - air_temp[i]
        if temp_diff < 8.6 and speed[i] < 1380:
            hdf[i] = 1

        # PWF: Power = torque * (speed * 2 * pi / 60)
        power = torque[i] * (speed[i] * 2 * np.pi / 60)
        if power < 3500 or power > 9000:
            pwf[i] = 1

        # OSF: Overstrain
        t_type = types[i]
        limit = 11000 if t_type == "L" else (12000 if t_type == "M" else 13000)
        if tool_wear[i] * torque[i] > limit:
            osf[i] = 1

        # RNF: 0.1% random failure
        if np.random.rand() < 0.001:
            rnf[i] = 1

    machine_failure = ((twf + hdf + pwf + osf + rnf) > 0).astype(int)

    df = pd.DataFrame({
        "UDI": np.arange(1, num_samples + 1),
        "Product ID": [f"{t}{i:05d}" for i, t in enumerate(types, 1)],
        "Type": types,
        "Air temperature [K]": np.round(air_temp, 1),
        "Process temperature [K]": np.round(process_temp, 1),
        "Rotational speed [rpm]": np.round(speed).astype(int),
        "Torque [Nm]": np.round(torque, 1),
        "Tool wear [min]": np.round(tool_wear).astype(int),
        "Machine failure": machine_failure,
        "TWF": twf,
        "HDF": hdf,
        "PWF": pwf,
        "OSF": osf,
        "RNF": rnf,
    })
    return df


def download_or_verify_data() -> str:
    """Verify or download the AI4I 2020 dataset."""
    os.makedirs(RAW_DATA_DIR, exist_ok=True)

    if os.path.exists(RAW_DATA_FILE):
        df = pd.read_csv(RAW_DATA_FILE)
        print(f"[OK] Existing dataset found at {RAW_DATA_FILE} with {len(df)} rows.")
        return RAW_DATA_FILE

    print(f"[INFO] Downloading AI4I 2020 dataset from {UCI_URL}...")
    zip_path = os.path.join(RAW_DATA_DIR, "ai4i2020.zip")
    try:
        urllib.request.urlretrieve(UCI_URL, zip_path)
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(RAW_DATA_DIR)
        for fname in os.listdir(RAW_DATA_DIR):
            if fname.endswith(".csv") and fname != "ai4i2020.csv":
                os.rename(os.path.join(RAW_DATA_DIR, fname), RAW_DATA_FILE)
                break
        if os.path.exists(zip_path):
            os.remove(zip_path)
        print(f"[OK] Downloaded and extracted dataset to {RAW_DATA_FILE}.")
    except Exception as e:
        print(f"[WARN] Failed to download dataset ({e}). Generating high-fidelity synthetic fallback...")
        df = generate_synthetic_data(10000)
        df.to_csv(RAW_DATA_FILE, index=False)
        print(f"[OK] Generated synthetic dataset at {RAW_DATA_FILE} ({len(df)} rows).")

    return RAW_DATA_FILE


if __name__ == "__main__":
    download_or_verify_data()
