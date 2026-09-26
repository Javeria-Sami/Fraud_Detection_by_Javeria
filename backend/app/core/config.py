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
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "20"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "10"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "3600"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_PRE_PING: bool = os.getenv("DB_POOL_PRE_PING", "true").lower() in ("true", "1", "yes")
    
    # ML Models directory
    MODEL_DIR: str = os.getenv("MODEL_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/saved_models")))
    
    # Risk Scoring Thresholds
    RISK_THRESHOLD_LOW: int = 30
    RISK_THRESHOLD_MEDIUM: int = 70
    RISK_THRESHOLD_HIGH: int = 90
    
    # Alert Cooldown (seconds) to prevent storm
    ALERT_COOLDOWN_SECONDS: int = 300
    
    # CORS (Explicit trusted origins, no wildcard on credentialed API)
    BACKEND_CORS_ORIGINS: list[str] = [
        origin.strip() for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
        ).split(",") if origin.strip()
    ]

    # Request Body Size Limits & Security Controls
    MAX_REQUEST_BODY_BYTES: int = int(os.getenv("MAX_REQUEST_BODY_BYTES", str(10 * 1024 * 1024))) # 10 MB limit
    SECURE_HEADERS_ENABLED: bool = os.getenv("SECURE_HEADERS_ENABLED", "true").lower() in ("true", "1", "yes")
    
    class Config:
        case_sensitive = True

settings = Settings()

