"""
Real-Time Fraud & Anomaly Detection Platform - Main FastAPI Application.
"""
import os
import json
import uuid
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, AsyncSessionLocal
from backend.app.core.security import get_password_hash
from backend.app.core.logging import setup_structured_logging, get_logger
from backend.app.core.telemetry.middleware import TelemetryMiddleware
from backend.app.models.user import User, Role
from backend.app.models.rule import FraudRule
from backend.app.models.audit_log import SystemSetting
from backend.app.models.ml_model import MLModelRegistry
from backend.app.db.seed import seed_database
from backend.app.engine.ml_engine import MLEngine
from backend.app.engine.pipeline import IngestionPipeline
from simulator.transaction_generator import generate_live_transaction

# Import API routers
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.transactions import router as transactions_router
from backend.app.api.v1.alerts import router as alerts_router
from backend.app.api.v1.cases import router as cases_router
from backend.app.api.v1.risk_profiles import router as risk_profiles_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.models import router as models_router
from backend.app.api.v1.risk import router as risk_router
from backend.app.api.v1.admin import router as admin_router
from backend.app.api.v1.audit import router as audit_router
from backend.app.api.v1.simulator import router as simulator_router
from backend.app.api.v1.websocket import router as ws_router
from backend.app.api.v1.search import router as search_router
from backend.app.api.v1.ml_monitoring import router as ml_monitoring_router
from backend.app.api.v1.ml_retraining import router as ml_retraining_router
from backend.app.api.v1.notifications import router as notifications_router
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.observability import router as observability_router

# Initialize structured logging engine
setup_structured_logging(
    level=os.getenv("LOG_LEVEL", "INFO"),
    json_format=os.getenv("LOG_JSON_FORMAT", "true").lower() in ("true", "1", "yes"),
    service_name=settings.PROJECT_NAME
)

async def seed_initial_database():
    """Seeds default roles, users, rules, devices, merchants, risk scores, alerts, cases, and settings."""
    await seed_database()

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not (os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME")):
        # Initialize DB Schema
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception:
            pass
            
        # Pre-load ML Engine
        try:
            from backend.app.engine.ml.service import MLInferenceService
            MLInferenceService._ensure_model_loaded()
        except Exception:
            pass
        
        # Seed Database only if empty
        try:
            from backend.app.models.user import User
            from sqlalchemy import select, func
            async with AsyncSessionLocal() as session:
                cnt = await session.scalar(select(func.count()).select_from(User))
                if not cnt:
                    await seed_initial_database()
        except Exception:
            pass
    
    yield
    
    # Teardown (only for long-running non-serverless processes)
    if not (os.getenv("VERCEL") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME")):
        await engine.dispose()

logger = logging.getLogger("fraudshield_api")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-oriented Real-Time Fraud & Anomaly Detection Platform API",
    lifespan=lifespan
)

# ---------------------------------------------------------------------------
# Section 25: Security Hardening Middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def security_hardening_middleware(request: Request, call_next):
    # 1. Request Body Size Limiter (Protect against Denial of Service / Memory Exhaustion)
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > settings.MAX_REQUEST_BODY_BYTES:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={"detail": "Request payload exceeds maximum allowed size (10 MB)."}
                )
        except (ValueError, TypeError):
            pass

    # 2. Execute Request
    response: Response = await call_next(request)

    # 3. HTTP Security Headers (Defense-in-Depth)
    if settings.SECURE_HEADERS_ENABLED:
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "img-src 'self' data: https:; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "font-src 'self'; "
            "connect-src 'self' ws: wss: http: https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )

    return response


# ---------------------------------------------------------------------------
# Global Safe Exception Handler (Prevent Raw Stack Traces / Schema Leakage)
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_ref = str(uuid.uuid4())[:8]
    logger.error("Unhandled exception [ref=%s] on %s %s: %s", error_ref, request.method, request.url.path, str(exc), exc_info=True)
    
    # Do not leak internal tracebacks, SQL statements, or file paths
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please contact the SOC security team if this persists.",
            "error_reference": error_ref
        }
    )


# Telemetry & Request Correlation Middleware
app.add_middleware(TelemetryMiddleware)

# CORS Middleware (Hardened with explicit origins and Vercel preview domain matching)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Mount API Routers
app.include_router(health_router)  # Mounted at root /health, /health/live, /health/ready
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(observability_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(transactions_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(cases_router, prefix=settings.API_V1_STR)
app.include_router(risk_profiles_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(models_router, prefix=settings.API_V1_STR)
app.include_router(ml_monitoring_router, prefix=settings.API_V1_STR)
app.include_router(ml_retraining_router, prefix=settings.API_V1_STR)
app.include_router(risk_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(simulator_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(ws_router, prefix=settings.API_V1_STR)
app.include_router(ws_router) # Also mount directly at /ws/live for convenience
