"""
Interactive Transaction Simulator API Endpoints.
Allows operators and testers to trigger synthetic transaction bursts, high-risk attacks, or steady streams.
Section 05 — Development Transaction Simulator with Environment Safeguards.
"""
import os
import asyncio
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import require_roles
from backend.app.engine.pipeline import IngestionPipeline
from simulator.transaction_generator import generate_live_transaction

router = APIRouter(
    prefix="/simulator",
    tags=["Simulator"],
    dependencies=[Depends(require_roles(["admin", "analyst"]))]
)

def verify_not_production():
    """Safety guard: strictly rejects simulator execution in production environments."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env == "production" or getattr(settings, "ENVIRONMENT", "development").lower() == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Synthetic transaction simulator is strictly disabled in production environment."
        )

class SimulatorConfig(BaseModel):
    is_running: bool = False
    rate_per_second: float = Field(1.0, ge=0.1, le=50.0)
    scenario: str = "mixed_risk"  # normal, fraud_spike, high_amount, rapid_burst, geo_hop, new_device, mixed_risk, crypto_drain
    anomaly_probability: float = Field(0.15, ge=0.0, le=1.0)

class SimulatorBurstRequest(BaseModel):
    count: int = Field(10, ge=1, le=500, description="Number of synthetic transactions to generate in burst")
    scenario: str = Field("mixed_risk", description="Attack or normal scenario profile")
    anomaly_probability: float = Field(0.2, ge=0.0, le=1.0)

class SimulatorState:
    is_running: bool = False
    rate_per_second: float = 1.0
    scenario: str = "mixed_risk"
    anomaly_probability: float = 0.15
    total_emitted: int = 0
    task: Optional[asyncio.Task] = None

_sim_state = SimulatorState()

async def simulator_background_loop():
    while _sim_state.is_running:
        try:
            # Check environment safety dynamically
            if os.getenv("ENVIRONMENT", "development").lower() == "production":
                _sim_state.is_running = False
                break
                
            txn_dict = generate_live_transaction(
                scenario=_sim_state.scenario,
                anomaly_probability=_sim_state.anomaly_probability
            )
            async with AsyncSessionLocal() as session:
                await IngestionPipeline.process_transaction(session, txn_dict)
            _sim_state.total_emitted += 1
        except Exception as e:
            print(f"[!] Simulator ingestion error: {e}")
            
        delay = max(0.02, 1.0 / max(0.1, _sim_state.rate_per_second))
        await asyncio.sleep(delay)

@router.get("/status")
async def get_simulator_status():
    verify_not_production()
    return {
        "is_running": _sim_state.is_running,
        "rate_per_second": _sim_state.rate_per_second,
        "scenario": _sim_state.scenario,
        "anomaly_probability": _sim_state.anomaly_probability,
        "total_emitted": _sim_state.total_emitted,
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@router.post("/start")
async def start_simulator(config: Optional[SimulatorConfig] = None):
    verify_not_production()
    if config:
        _sim_state.rate_per_second = config.rate_per_second
        _sim_state.scenario = config.scenario
        _sim_state.anomaly_probability = config.anomaly_probability

    if not _sim_state.is_running:
        _sim_state.is_running = True
        _sim_state.task = asyncio.create_task(simulator_background_loop())

    return {
        "message": "Simulator stream started",
        "status": await get_simulator_status()
    }

@router.post("/stop")
async def stop_simulator():
    verify_not_production()
    _sim_state.is_running = False
    if _sim_state.task:
        _sim_state.task.cancel()
        _sim_state.task = None
    return {
        "message": "Simulator stream stopped",
        "status": await get_simulator_status()
    }

@router.post("/emit")
async def emit_single_transaction(scenario: Optional[str] = None):
    """Emits a single synthetic development transaction immediately."""
    verify_not_production()
    chosen_scenario = scenario or _sim_state.scenario
    txn_dict = generate_live_transaction(
        scenario=chosen_scenario,
        anomaly_probability=_sim_state.anomaly_probability
    )
    async with AsyncSessionLocal() as session:
        txn, alert = await IngestionPipeline.process_transaction(session, txn_dict)
    _sim_state.total_emitted += 1
    return {
        "transaction_id": txn.id,
        "amount": txn.amount,
        "risk_score": txn.risk_score,
        "risk_level": txn.risk_level,
        "status": txn.status,
        "source": txn.source,
        "alert_created": alert is not None
    }

@router.post("/burst")
async def emit_burst_transactions(burst: SimulatorBurstRequest):
    """Emits a burst of N synthetic transactions in development/testing environments."""
    verify_not_production()
    results = []
    async with AsyncSessionLocal() as session:
        for _ in range(burst.count):
            txn_dict = generate_live_transaction(
                scenario=burst.scenario,
                anomaly_probability=burst.anomaly_probability
            )
            txn, alert = await IngestionPipeline.process_transaction(session, txn_dict)
            _sim_state.total_emitted += 1
            results.append({
                "transaction_id": txn.id,
                "amount": txn.amount,
                "risk_score": txn.risk_score,
                "risk_level": txn.risk_level,
                "status": txn.status
            })
    return {
        "message": f"Successfully emitted {len(results)} synthetic transactions",
        "count": len(results),
        "sample": results[:5]
    }
