"""
Application Configuration and Environment Settings.
"""
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Real-Time Fraud & Anomaly Detection Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "DEVELOPMENT")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")
    
    # Security & JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "FRAUDSHIELD_SUPER_SECURE_PRODUCTION_KEY_2026_JWT_0987654321")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", os.getenv("SECRET_KEY", "FRAUDSHIELD_SUPER_SECURE_PRODUCTION_KEY_2026_JWT_0987654321"))
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # Database
    # Defaults to local SQLite for instant zero-dependency execution, can be overridden with postgresql:// in docker/prod
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./fraud_detection.db")
    SYNC_DATABASE_URL: str = os.getenv("SYNC_DATABASE_URL", "sqlite:///./fraud_detection.db")
    
    # ML Models directory
    MODEL_DIR: str = os.getenv("MODEL_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/saved_models")))
    
    # Risk Scoring Thresholds
    RISK_THRESHOLD_LOW: int = 30
    RISK_THRESHOLD_MEDIUM: int = 70
    RISK_THRESHOLD_HIGH: int = 90
    
    # Alert Cooldown (seconds) to prevent storm
    ALERT_COOLDOWN_SECONDS: int = 300
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["*"]
    
    class Config:
        case_sensitive = True

settings = Settings()
