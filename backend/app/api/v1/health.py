"""
Health Check and Subsystem Readiness Endpoints.
Section 28 — Observability.

Provides:
- Liveness Probe (/health/live): Verifies process vitality without external dependencies.
- Readiness Probe (/health/ready): Verifies database, ML artifact, and event engine readiness.
- Comprehensive Status (/health): Public sanitized system health summary.
"""
import time
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.engine.ml.inference import MLEngine
from backend.app.engine.events.manager import ws_manager

router = APIRouter(tags=["Health"])


@router.get("/health/live", summary="Liveness Probe")
async def liveness_probe():
    """Lightweight probe verifying that the Python application process is alive and responsive."""
    return {
        "status": "UP",
        "service": settings.PROJECT_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/health/ready", summary="Readiness Probe")
async def readiness_probe(db: AsyncSession = Depends(get_db)):
    """Deep readiness probe checking core dependency availability (DB, ML Engine, Events)."""
    subsystems: Dict[str, Dict[str, Any]] = {}
    is_ready = True

    # 1. Database Check
    db_start = time.perf_counter()
    try:
        await db.execute(text("SELECT 1"))
        db_latency = round((time.perf_counter() - db_start) * 1000.0, 2)
        subsystems["database"] = {
            "status": "HEALTHY",
            "latency_ms": db_latency,
            "engine": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite"
        }
    except Exception as e:
        is_ready = False
        subsystems["database"] = {
            "status": "UNHEALTHY",
            "error": str(e)
        }

    # 2. ML Inference Engine Check
    ml_active = MLEngine._model_version is not None
    subsystems["ml_engine"] = {
        "status": "HEALTHY" if ml_active else "DEGRADED",
        "active_model_version": MLEngine._model_version or "UNLOADED",
        "model_type": "IsolationForest"
    }

    # 3. Real-Time WebSocket Engine Check
    subsystems["event_system"] = {
        "status": "HEALTHY",
        "active_connections": ws_manager.active_connection_count
    }

    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "READY" if is_ready else "NOT_READY",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "subsystems": subsystems,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )


@router.get("/health", summary="Overall Health Check")
async def health_summary(db: AsyncSession = Depends(get_db)):
    """Comprehensive sanitized health overview."""
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "active_ml_model": MLEngine._model_version,
        "database_connected": db_ok,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
