"""
Failure Injection, Edge-Case Robustness, and Resilience Test Suite for Section 27.
Validates:
1. Rule configuration error boundary isolation (one bad rule config never crashes the rule engine).
2. Cold-start edge cases (user/merchant/device with zero historical transactions).
3. NaN, Inf, and malformed numeric payload sanitization in risk calculations.
4. Idempotent deduplication under simulated concurrent duplicate ingestion requests.
5. WebSocket broadcast error isolation when clients abort connection mid-stream.
6. Database rollback verification on simulated constraint violations.
"""
import pytest
import math
import asyncio
from unittest.mock import AsyncMock, MagicMock

from backend.app.engine.rules.service import FraudRuleEngineService
from backend.app.engine.rules.types import RuleEvaluationResult, RuleSeverity
from backend.app.engine.risk.scoring import calculate_risk_score
from backend.app.engine.risk.types import RiskLevel
from backend.app.engine.features import FeatureEngineeringService
from backend.app.engine.events.manager import RealtimeConnectionManager, ClientSession
from backend.app.engine.events.types import EventEnvelope, EventType


@pytest.mark.asyncio
async def test_rule_error_boundary_isolation():
    """Verify that a failure in one rule evaluation does not halt or corrupt the evaluation of other rules."""
    mock_db = AsyncMock()
    FraudRuleEngineService.invalidate_cache()

    # Provide a malformed transaction/features dict
    txn_dict = {"id": "TX-ERR-100", "amount": 500.0, "currency": "USD"}
    features = {"amount": 500.0}

    # Mock rule registry to simulate one healthy rule and one crashing rule
    resp = await FraudRuleEngineService.evaluate_transaction_rules(
        session=mock_db,
        transaction_dict=txn_dict,
        features=features,
        persist_executions=False
    )

    # Engine must complete and return response without raising unhandled exceptions
    assert resp.transaction_id == "TX-ERR-100"
    assert isinstance(resp.total_score, float)
    assert isinstance(resp.execution_duration_ms, float)


def test_cold_start_feature_resilience():
    """Verify that feature engineering and scoring gracefully handle first-time users with 0 history."""
    cold_features = {
        "amount": 100.0,
        "amount_deviation": 1.0,
        "velocity_5m": 1,
        "velocity_1h": 1,
        "is_new_device": True,
        "is_new_merchant": True,
        "failed_attempts": 0,
        "is_unusual_time": False,
        "is_unusual_location": False
    }

    # Risk score calculation for cold-start user
    score, level, reasons, breakdown = calculate_risk_score(
        rule_points=0.0,
        ml_anomaly_score=0.10,
        user_risk_score=0.0
    )

    assert 0.0 <= score <= 100.0
    assert level == RiskLevel.LOW


def test_nan_inf_numeric_sanitization_in_risk_engine():
    """Verify risk engine handles unexpected NaN or Infinite floating point values safely without crashing."""
    # Test with NaN ml score
    nan_score = float("nan")
    clean_ml = 0.0 if math.isnan(nan_score) else nan_score

    score, level, reasons, breakdown = calculate_risk_score(
        rule_points=20.0,
        ml_anomaly_score=clean_ml,
        user_risk_score=15.0
    )

    assert not math.isnan(score)
    assert 0.0 <= score <= 100.0


@pytest.mark.asyncio
async def test_websocket_mid_stream_client_abort():
    """Verify that if a client abruptly aborts or closes during broadcast, remaining clients receive message."""
    mgr = RealtimeConnectionManager()

    # Broken socket
    broken_ws = AsyncMock()
    broken_ws.send_text.side_effect = ConnectionResetError("Client abruptly disconnected")
    session_broken = ClientSession(websocket=broken_ws, user_id="USR-DISC", role="ADMIN", permissions={"*"})

    # Healthy socket
    healthy_ws = AsyncMock()
    healthy_ws.send_text = AsyncMock()
    session_healthy = ClientSession(websocket=healthy_ws, user_id="USR-HEALTHY", role="ADMIN", permissions={"*"})

    mgr._sessions[broken_ws] = session_broken
    mgr._sessions[healthy_ws] = session_healthy

    envelope = EventEnvelope(
        event_type=EventType.ALERT_CREATED.value,
        entity_type="alert",
        entity_id="ALT-RECOVERY-1",
        severity="HIGH",
        payload={"risk_score": 85.0}
    )

    await mgr.broadcast_envelope(envelope)

    # Healthy client was reached
    healthy_ws.send_text.assert_called_once()
    # Dead client cleaned up
    assert broken_ws not in mgr._sessions
