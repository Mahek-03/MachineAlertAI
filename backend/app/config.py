"""
Backend configuration and settings for MachineAlert AI.
Uses Pydantic BaseSettings for robust environment-based configuration.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "MachineAlert AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./machinealert.db")

    # Risk Thresholds (% probability)
    THRESHOLD_NORMAL_MAX: float = 30.0  # < 30% is Normal (green)
    THRESHOLD_MEDIUM_MAX: float = 60.0  # 30% to < 60% is Medium Risk (amber), >= 60% is High Risk (red)

    # ML Artifacts directory
    ARTIFACTS_DIR: str = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts")
    CLASSIFIER_PATH: str = os.path.join(ARTIFACTS_DIR, "classifier.joblib")
    RUL_MODEL_PATH: str = os.path.join(ARTIFACTS_DIR, "rul_model.joblib")
    SCALER_PATH: str = os.path.join(ARTIFACTS_DIR, "scaler.joblib")
    METRICS_PATH: str = os.path.join(ARTIFACTS_DIR, "metrics.json")

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
