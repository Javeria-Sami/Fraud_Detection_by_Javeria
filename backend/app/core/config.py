"""
Application Configuration and Environment Settings.
"""
import os
from pydantic_settings import BaseSettings

def _resolve_database_urls() -> tuple[str, str]:
    db_env = os.getenv("DATABASE_URL")
    sync_env = os.getenv("SYNC_DATABASE_URL")
    if db_env:
        return db_env, sync_env or db_env.replace("+asyncpg", "").replace("+aiosqlite", "")
    
    # Handle Vercel / AWS Lambda read-only root filesystem
    if os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        import tempfile
        import shutil
        tmp_dir = tempfile.gettempdir()
        tmp_db = os.path.abspath(os.path.join(tmp_dir, "fraud_detection.db"))
        root_db = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../fraud_detection.db"))
        if not os.path.exists(tmp_db) and os.path.exists(root_db):
            try:
                shutil.copyfile(root_db, tmp_db)
            except Exception:
                pass
        if os.name == 'nt':
            return f"sqlite+aiosqlite:///{tmp_db}", f"sqlite:///{tmp_db}"
        else:
            clean_path = tmp_db.lstrip('/')
            return f"sqlite+aiosqlite:////{clean_path}", f"sqlite:////{clean_path}"

    return "sqlite+aiosqlite:///./fraud_detection.db", "sqlite:///./fraud_detection.db"

_default_async_db, _default_sync_db = _resolve_database_urls()

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
    DATABASE_URL: str = _default_async_db
    SYNC_DATABASE_URL: str = _default_sync_db
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
    
    # CORS (Explicit trusted origins and dynamic regex for Vercel preview/production deployments)
    CORS_ORIGIN_REGEX: str | None = os.getenv("CORS_ORIGIN_REGEX", r"^https:\/\/.*\.vercel\.app$")
    BACKEND_CORS_ORIGINS: list[str] = [
        origin.strip() for origin in (
            os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
            ) + (f",{os.getenv('FRONTEND_URL')}" if os.getenv("FRONTEND_URL") else "")
        ).split(",") if origin.strip()
    ]

    # Request Body Size Limits & Security Controls
    MAX_REQUEST_BODY_BYTES: int = int(os.getenv("MAX_REQUEST_BODY_BYTES", str(10 * 1024 * 1024))) # 10 MB limit
    SECURE_HEADERS_ENABLED: bool = os.getenv("SECURE_HEADERS_ENABLED", "true").lower() in ("true", "1", "yes")
    
    class Config:
        case_sensitive = True

settings = Settings()

