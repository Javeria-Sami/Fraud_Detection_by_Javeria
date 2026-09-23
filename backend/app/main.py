"""
Real-Time Fraud & Anomaly Detection Platform - Main FastAPI Application.
"""
import os
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, AsyncSessionLocal
from backend.app.core.security import get_password_hash
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

async def seed_initial_database():
    """Seeds default roles, users, rules, devices, merchants, risk scores, alerts, cases, and settings."""
    await seed_database()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB Schema
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    # Pre-load ML Engine
    MLEngine.get_pipeline()
    
    # Seed Database
    await seed_initial_database()
    
    yield
    
    # Teardown
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-oriented Real-Time Fraud & Anomaly Detection Platform API",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
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
app.include_router(simulator_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(ws_router, prefix=settings.API_V1_STR)
app.include_router(ws_router) # Also mount directly at /ws/live for convenience

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "active_ml_model": MLEngine._model_version,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
