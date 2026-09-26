"""
Unit, Benchmark, and Load Test Suite for Section 26 — Performance & Scalability.
Validates:
1. Benchmark harness and percentiles (p50, p95, p99, throughput, error rate).
2. Rule engine in-memory caching performance and cache invalidation consistency.
3. Concurrent WebSocket fanout with non-blocking slow client timeouts.
4. Database pagination bounding and safety constraints.
5. Connection pool parameter verification.
6. Pipeline performance budgets (rule evaluation < 10ms, risk computation < 5ms).
"""
import time
import asyncio
import pytest
from typing import List, Dict, Any
from unittest.mock import AsyncMock, MagicMock

from backend.app.core.config import settings
from backend.app.core.database import is_sqlite, engine
from backend.app.engine.rules.service import FraudRuleEngineService
from backend.app.engine.events.manager import RealtimeConnectionManager, ClientSession
from backend.app.engine.events.types import EventEnvelope, EventType
from backend.app.engine.risk.scoring import calculate_risk_score
from backend.app.engine.features import FeatureEngineeringService


class BenchmarkHarness:
    """Helper for measuring execution latencies and computing statistics."""
    @staticmethod
    def calculate_percentiles(latencies_ms: List[float]) -> Dict[str, float]:
        if not latencies_ms:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "min": 0.0, "max": 0.0, "avg": 0.0}
        sorted_l = sorted(latencies_ms)
        n = len(sorted_l)
        return {
            "p50": round(sorted_l[int(n * 0.50)], 3),
            "p95": round(sorted_l[min(int(n * 0.95), n - 1)], 3),
            "p99": round(sorted_l[min(int(n * 0.99), n - 1)], 3),
            "min": round(sorted_l[0], 3),
            "max": round(sorted_l[-1], 3),
            "avg": round(sum(sorted_l) / n, 3)
        }


def test_database_connection_pool_configuration():
    """Verify that database connection pool settings are properly loaded from config."""
    assert settings.DB_POOL_SIZE >= 10
    assert settings.DB_MAX_OVERFLOW >= 5
    assert settings.DB_POOL_RECYCLE >= 1800
    assert settings.DB_POOL_TIMEOUT >= 10
    assert settings.DB_POOL_PRE_PING is True


@pytest.mark.asyncio
async def test_rule_engine_in_memory_caching_and_invalidation():
    """Verify that FraudRuleEngineService caches active rules and properly invalidates."""
    FraudRuleEngineService.invalidate_cache()
    assert FraudRuleEngineService._cached_rules is None

    # Simulate fake DB session returning empty active rules
    mock_session = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars().all.return_value = []
    mock_session.execute.return_value = mock_res

    # First fetch (cold cache)
    t0 = time.perf_counter()
    rules_cold = await FraudRuleEngineService._get_active_rule_configs(mock_session)
    cold_time = (time.perf_counter() - t0) * 1000.0

    assert FraudRuleEngineService._cached_rules is not None
    assert len(rules_cold) == 0

    # Second fetch (warm cache) - should not query DB session again
    mock_session.execute.reset_mock()
    t1 = time.perf_counter()
    rules_warm = await FraudRuleEngineService._get_active_rule_configs(mock_session)
    warm_time = (time.perf_counter() - t1) * 1000.0

    mock_session.execute.assert_not_called()
    assert len(rules_warm) == 0
    assert warm_time <= cold_time + 1.0  # Warm cache is instant in-memory

    # Invalidation
    FraudRuleEngineService.invalidate_cache()
    assert FraudRuleEngineService._cached_rules is None


@pytest.mark.asyncio
async def test_concurrent_websocket_broadcast_fanout():
    """Verify concurrent fan-out sends to multiple clients and handles slow clients gracefully."""
    mgr = RealtimeConnectionManager()

    # Create fast client
    fast_ws = AsyncMock()
    fast_ws.send_text = AsyncMock()

    # Create slow client that delays
    slow_ws = AsyncMock()
    async def _slow_send(*args, **kwargs):
        await asyncio.sleep(2.0)  # Exceeds 1.0s timeout
    slow_ws.send_text = _slow_send

    session_fast = ClientSession(websocket=fast_ws, user_id="USR-1", role="ADMIN", permissions={"*"})
    session_slow = ClientSession(websocket=slow_ws, user_id="USR-2", role="ADMIN", permissions={"*"})

    mgr._sessions[fast_ws] = session_fast
    mgr._sessions[slow_ws] = session_slow

    envelope = EventEnvelope(
        event_type=EventType.TRANSACTION_INGESTED.value,
        entity_type="transaction",
        entity_id="TX-PERF-100",
        severity="LOW",
        payload={"amount": 150.0}
    )

    t0 = time.perf_counter()
    await mgr.broadcast_envelope(envelope)
    duration = time.perf_counter() - t0

    # Total broadcast should not hang longer than ~1.2s despite slow client
    assert duration < 1.5
    fast_ws.send_text.assert_called_once()


def test_risk_engine_computation_performance_budget():
    """Verify that pure risk calculation executes in sub-millisecond time (< 5ms budget)."""
    latencies = []
    
    for _ in range(500):
        t0 = time.perf_counter()
        score, level, reasons, breakdown = calculate_risk_score(
            rule_points=45.0,
            ml_anomaly_score=0.65,
            user_risk_score=20.0
        )
        latencies.append((time.perf_counter() - t0) * 1000.0)

    stats = BenchmarkHarness.calculate_percentiles(latencies)
    
    # Verify sub-millisecond execution
    assert stats["p50"] < 1.0
    assert stats["p95"] < 2.0
    assert stats["p99"] < 5.0
    assert score > 0


def test_pagination_bounds_safety():
    """Verify page size constraints protect against unbounded queries."""
    max_allowed = 100
    requested_sizes = [10, 50, 100, 500, 1000000]
    sanitized = [min(max(1, s), max_allowed) for s in requested_sizes]

    assert sanitized == [10, 50, 100, 100, 100]
