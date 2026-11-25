"""
Backend configuration and settings for MachineAlert AI.
Uses Pydantic BaseSettings for robust environment-based configuration.
"""
import os
import json
from typing import Union, List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return ["*"]
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            origins = [origin.strip() for origin in v.split(",") if origin.strip()]
            return origins if origins else ["*"]
        elif isinstance(v, (list, tuple)):
            return list(v)
        return ["*"]

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()
