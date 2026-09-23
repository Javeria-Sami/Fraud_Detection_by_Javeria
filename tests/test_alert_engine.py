"""
Unit and Integration Test Suite for Section 10 — Alert Engine.
Validates pure condition evaluation, threshold triggers, alert types, severity/priority mappings,
explainability, deduplication, cooldown storm suppression, lifecycle state machine transitions,
database persistence, RBAC, and REST API endpoints.
"""
import pytest
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.main import app
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import create_access_token
from backend.app.models.transaction import Transaction
from backend.app.models.risk_score import RiskScore
from backend.app.models.alert import Alert
from backend.app.engine.risk.types import RiskResult, RiskLevel, RiskExplanationFactor
from backend.app.engine.alerts.types import (
    AlertType,
    AlertSeverity,
    AlertPriority,
    AlertStatus,
    AlertDecision
)
from backend.app.engine.alerts.config import AlertEngineConfig, default_alert_config, ALERT_CONFIG_VERSION
from backend.app.engine.alerts.condition_evaluator import AlertConditionEvaluator
from backend.app.engine.alerts.lifecycle import AlertLifecycleManager, InvalidAlertStateTransitionError
from backend.app.engine.alerts.service import AlertEngineService
from backend.app.engine.pipeline import IngestionPipeline


# ---------------------------------------------------------------------------
# Pure Condition Evaluation & Threshold Tests
# ---------------------------------------------------------------------------

def test_alert_condition_thresholds():
    """Verify below threshold (no alert), high threshold (HIGH alert), and critical threshold (CRITICAL alert)."""
    cfg = AlertEngineConfig(high_risk_threshold=70.1, critical_risk_threshold=90.1)
    
    # 1. Low/Medium risk: No alert generated
    low_risk = RiskResult(
        transaction_id="TX-LOW",
        risk_score=45.0,
        risk_level=RiskLevel.MEDIUM
    )
    decision_low = AlertConditionEvaluator.evaluate(low_risk, {"id": "TX-LOW", "amount": 100.0}, cfg)
    assert not decision_low.should_create_alert
    assert "below configured alert thresholds" in decision_low.reason

    # 2. High risk: HIGH alert generated with P2 priority
    high_risk = RiskResult(
        transaction_id="TX-HIGH",
        risk_score=75.0,
        risk_level=RiskLevel.HIGH
    )
    decision_high = AlertConditionEvaluator.evaluate(high_risk, {"id": "TX-HIGH", "amount": 2500.0}, cfg)
    assert decision_high.should_create_alert
    assert decision_high.alert_type == AlertType.HIGH_RISK_TRANSACTION
    assert decision_high.severity == AlertSeverity.HIGH
    assert decision_high.priority == AlertPriority.P2

    # 3. Critical risk: CRITICAL alert generated with P1 priority
    crit_risk = RiskResult(
        transaction_id="TX-CRIT",
        risk_score=95.0,
        risk_level=RiskLevel.CRITICAL
    )
    decision_crit = AlertConditionEvaluator.evaluate(crit_risk, {"id": "TX-CRIT", "amount": 15000.0}, cfg)
    assert decision_crit.should_create_alert
    assert decision_crit.alert_type == AlertType.CRITICAL_RISK_TRANSACTION
    assert decision_crit.severity == AlertSeverity.CRITICAL
    assert decision_crit.priority == AlertPriority.P1


def test_alert_type_mapping_and_behavioral_signals():
    """Verify specific behavioral and ML anomaly condition mappings."""
    cfg = AlertEngineConfig()

    # 1. Standalone ML Anomaly trigger
    ml_risk = RiskResult(
        transaction_id="TX-ML",
        risk_score=60.0,
        risk_level=RiskLevel.MEDIUM,
        ml_score=92.0 # 92% anomaly probability
    )
    decision_ml = AlertConditionEvaluator.evaluate(ml_risk, {"id": "TX-ML", "amount": 300.0}, cfg)
    assert decision_ml.should_create_alert
    assert decision_ml.alert_type == AlertType.ML_ANOMALY
    assert decision_ml.severity == AlertSeverity.HIGH

    # 2. Velocity burst behavioral condition
    vel_factor = RiskExplanationFactor(
        factor_name="Short-Term Velocity Surge",
        code="BEHAVIOR_VELOCITY",
        weight=0.4,
        score=40.0,
        contribution=16.0,
        description="5 transactions in 5 minutes."
    )
    vel_risk = RiskResult(
        transaction_id="TX-VEL",
        risk_score=50.0,
        risk_level=RiskLevel.MEDIUM,
        factors=[vel_factor]
    )
    decision_vel = AlertConditionEvaluator.evaluate(vel_risk, {"id": "TX-VEL", "amount": 100.0}, cfg)
    assert decision_vel.should_create_alert
    assert decision_vel.alert_type == AlertType.RAPID_TRANSACTION_ACTIVITY


def test_evidence_and_explainability_payload():
    """Verify that alert decisions embed transparent, structured evidence without sensitive leaks."""
    factor = RiskExplanationFactor(
        factor_name="High Transaction Amount",
        code="RULE_HIGH_AMOUNT",
        weight=1.0,
        score=80.0,
        contribution=80.0,
        description="Amount 10,000 exceeds 5,000 threshold.",
        evidence={"amount": 10000.0, "threshold": 5000.0}
    )
    risk_res = RiskResult(
        transaction_id="TX-EV-1",
        risk_score=85.0,
        risk_level=RiskLevel.HIGH,
        rule_score=80.0,
        ml_score=65.0,
        factors=[factor]
    )
    txn_dict = {
        "id": "TX-EV-1",
        "user_id": "USR-1001",
        "amount": 10000.0,
        "currency": "USD",
        "merchant_name": "Luxury Jeweler"
    }
    decision = AlertConditionEvaluator.evaluate(risk_res, txn_dict)
    
    assert decision.should_create_alert
    assert "TX-EV-1" in decision.description
    assert decision.evidence["transaction_id"] == "TX-EV-1"
    assert decision.evidence["risk_score"] == 85.0
    assert decision.evidence["user_id"] == "USR-1001"
    assert len(decision.evidence["factors"]) == 1


# ---------------------------------------------------------------------------
# Lifecycle State Machine & Transition Tests
# ---------------------------------------------------------------------------

def test_alert_lifecycle_state_transitions():
    """Verify valid and invalid state transitions in the alert lifecycle state machine."""
    # Valid transitions
    assert AlertLifecycleManager.can_transition("NEW", "ACKNOWLEDGED")
    assert AlertLifecycleManager.can_transition("NEW", "INVESTIGATING")
    assert AlertLifecycleManager.can_transition("ACKNOWLEDGED", "INVESTIGATING")
    assert AlertLifecycleManager.can_transition("INVESTIGATING", "RESOLVED")
    assert AlertLifecycleManager.can_transition("RESOLVED", "CLOSED")
    assert AlertLifecycleManager.can_transition("OPEN", "DISMISSED")
    assert AlertLifecycleManager.can_transition("ACKNOWLEDGED", "ESCALATED")
    assert AlertLifecycleManager.can_transition("ESCALATED", "RESOLVED")

    # Invalid transitions
    assert not AlertLifecycleManager.can_transition("RESOLVED", "NEW")
    assert not AlertLifecycleManager.can_transition("CLOSED", "INVESTIGATING")
    assert not AlertLifecycleManager.can_transition("DISMISSED", "OPEN")

    with pytest.raises(InvalidAlertStateTransitionError):
        AlertLifecycleManager.validate_transition("RESOLVED", "NEW")

    with pytest.raises(InvalidAlertStateTransitionError):
        AlertLifecycleManager.validate_transition("CLOSED", "ACKNOWLEDGED")


# ---------------------------------------------------------------------------
# Database Persistence, Deduplication & Cooldown Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_alert_persistence_and_deduplication():
    """Verify alert persistence and strict deduplication on duplicate evaluation."""
    async with AsyncSessionLocal() as session:
        txn_id = f"TX-ALT-DEDUP-{uuid.uuid4().hex[:8]}"
        user_id = f"USR-DEDUP-{uuid.uuid4().hex[:6]}"

        # Create base transaction
        txn = Transaction(
            id=txn_id,
            transaction_id=txn_id,
            user_id=user_id,
            merchant_id="MERCH-AMAZON",
            amount=8500.0,
            currency="USD",
            payment_method="CREDIT_CARD",
            timestamp=datetime.now(timezone.utc),
            status="PENDING"
        )
        session.add(txn)
        await session.commit()

        risk_res = RiskResult(
            transaction_id=txn_id,
            risk_score=85.0,
            risk_level=RiskLevel.HIGH
        )
        txn_dict = {"id": txn_id, "user_id": user_id, "amount": 8500.0}

        # 1. First alert generation
        alert1 = await AlertEngineService.process_and_persist_alert(session, risk_res, txn_dict)
        assert alert1 is not None
        await session.commit()

        # 2. Second alert generation (Deduplicated - same alert returned, no duplicate created)
        alert2 = await AlertEngineService.process_and_persist_alert(session, risk_res, txn_dict)
        assert alert2 is not None
        assert alert2.id == alert1.id

        # Verify exactly one record exists in DB
        stmt = select(Alert).where(Alert.transaction_id == txn_id)
        db_res = await session.execute(stmt)
        alerts = db_res.scalars().all()
        assert len(alerts) == 1


@pytest.mark.asyncio
async def test_alert_cooldown_storm_suppression():
    """Verify non-critical alerts are suppressed within cooldown, while critical alerts bypass cooldown."""
    async with AsyncSessionLocal() as session:
        user_id = f"USR-STORM-{uuid.uuid4().hex[:6]}"
        txn1_id = f"TX-STORM-1-{uuid.uuid4().hex[:6]}"
        txn2_id = f"TX-STORM-2-{uuid.uuid4().hex[:6]}"
        txn3_crit = f"TX-STORM-3-{uuid.uuid4().hex[:6]}"

        # 1. Create first HIGH alert for user
        risk1 = RiskResult(transaction_id=txn1_id, risk_score=75.0, risk_level=RiskLevel.HIGH)
        alert1 = await AlertEngineService.process_and_persist_alert(session, risk1, {"id": txn1_id, "user_id": user_id})
        assert alert1 is not None
        await session.commit()

        # 2. Immediate second HIGH alert for same user -> Suppressed by cooldown
        risk2 = RiskResult(transaction_id=txn2_id, risk_score=78.0, risk_level=RiskLevel.HIGH)
        alert2 = await AlertEngineService.process_and_persist_alert(session, risk2, {"id": txn2_id, "user_id": user_id})
        assert alert2 is None # Suppressed!

        # 3. Immediate CRITICAL alert for same user -> Bypasses cooldown!
        risk3 = RiskResult(transaction_id=txn3_crit, risk_score=95.0, risk_level=RiskLevel.CRITICAL)
        alert3 = await AlertEngineService.process_and_persist_alert(session, risk3, {"id": txn3_crit, "user_id": user_id})
        assert alert3 is not None
        assert alert3.severity == "CRITICAL"


@pytest.mark.asyncio
async def test_alert_status_update_and_lifecycle_timestamps():
    """Verify updating alert status sets corresponding timestamp and logs audit trail."""
    async with AsyncSessionLocal() as session:
        txn_id = f"TX-LIFE-{uuid.uuid4().hex[:8]}"
        risk_res = RiskResult(transaction_id=txn_id, risk_score=85.0, risk_level=RiskLevel.HIGH)
        alert = await AlertEngineService.process_and_persist_alert(session, risk_res, {"id": txn_id, "user_id": "USR-LIFE"})
        assert alert is not None
        await session.commit()

        # 1. Acknowledge alert
        updated1 = await AlertEngineService.update_alert_status(
            session=session,
            alert=alert,
            new_status="ACKNOWLEDGED",
            actor_email="analyst@fraudshield.io",
            actor_role="ANALYST",
            assigned_to="analyst@fraudshield.io"
        )
        await session.commit()
        assert updated1.status == "ACKNOWLEDGED"
        assert updated1.acknowledged_at is not None
        assert updated1.resolved_at is None

        # 2. Resolve alert
        updated2 = await AlertEngineService.update_alert_status(
            session=session,
            alert=updated1,
            new_status="RESOLVED",
            actor_email="analyst@fraudshield.io",
            actor_role="ANALYST",
            note="False positive confirmed with customer."
        )
        await session.commit()
        assert updated2.status == "RESOLVED"
        assert updated2.resolved_at is not None


# ---------------------------------------------------------------------------
# Pipeline Integration Test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pipeline_integration_with_alert_generation():
    """Verify that IngestionPipeline automatically creates an Alert for high-risk transactions."""
    async with AsyncSessionLocal() as session:
        txn_id = f"TX-ALT-PIPE-{uuid.uuid4().hex[:8]}"
        user_id = f"USR-PIPE-{uuid.uuid4().hex[:6]}"
        txn_payload = {
            "transaction_id": txn_id,
            "user_id": user_id,
            "merchant_id": "MERCH-CASINO",
            "merchant_name": "Monte Carlo Royale",
            "merchant_category": "Gambling & Casino",
            "device_id": "DEV-NEW-99",
            "amount": 95000.0,
            "currency": "USD",
            "channel": "ONLINE",
            "payment_method": "CREDIT_CARD",
            "location_country": "MC",
            "city": "Monaco",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Ensure high risk alert condition
        AlertEngineService.get_config().high_risk_threshold = 50.0

        try:
            txn_record, alert_record = await IngestionPipeline.process_transaction(session, txn_payload)
            await session.commit()

            assert txn_record.risk_score > 0.0
            assert alert_record is not None
            assert alert_record.transaction_id == txn_record.id
            assert alert_record.status == "NEW"
        finally:
            AlertEngineService.get_config().high_risk_threshold = 70.1


# ---------------------------------------------------------------------------
# API Endpoints Integration Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_alert_api_endpoints():
    """Verify GET /alerts, GET /alerts/config, PATCH /alerts/config, POST /alerts/evaluate, PATCH /alerts/{id}."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        admin_token = create_access_token(data={"sub": "USR-ADMIN-01", "role": "ADMIN", "roles": ["ADMIN"]})
        analyst_token = create_access_token(data={"sub": "USR-ANALYST-01", "role": "ANALYST", "roles": ["ANALYST"]})
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        analyst_headers = {"Authorization": f"Bearer {analyst_token}"}

        # 1. GET /api/v1/alerts/config
        cfg_resp = await client.get("/api/v1/alerts/config", headers=analyst_headers)
        assert cfg_resp.status_code == 200
        cfg_data = cfg_resp.json()
        assert "high_risk_threshold" in cfg_data
        assert "cooldown_seconds" in cfg_data
        assert cfg_data["alert_config_version"] == ALERT_CONFIG_VERSION

        # 2. PATCH /api/v1/alerts/config (Admin authorized)
        update_resp = await client.patch(
            "/api/v1/alerts/config",
            headers=admin_headers,
            json={"cooldown_seconds": 240, "high_risk_threshold": 72.0}
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["cooldown_seconds"] == 240
        assert update_resp.json()["high_risk_threshold"] == 72.0

        # Reset back
        await client.patch(
            "/api/v1/alerts/config",
            headers=admin_headers,
            json={"cooldown_seconds": 300, "high_risk_threshold": 70.1}
        )

        # 3. PATCH /api/v1/alerts/config (Analyst unauthorized -> 403)
        unauth_resp = await client.patch(
            "/api/v1/alerts/config",
            headers=analyst_headers,
            json={"cooldown_seconds": 100}
        )
        assert unauth_resp.status_code == 403

        # 4. POST /api/v1/alerts/evaluate with persist=True
        eval_resp = await client.post(
            "/api/v1/alerts/evaluate",
            headers=analyst_headers,
            json={
                "transaction_id": f"TX-API-EVAL-{uuid.uuid4().hex[:6]}",
                "user_id": "USR-API-EVAL",
                "risk_score": 88.0,
                "risk_level": "HIGH",
                "persist": True
            }
        )
        assert eval_resp.status_code == 200
        eval_data = eval_resp.json()
        assert eval_data["should_create_alert"] is True
        assert eval_data["created_alert_id"] is not None
        created_id = eval_data["created_alert_id"]

        # 5. GET /api/v1/alerts/{id}
        get_resp = await client.get(f"/api/v1/alerts/{created_id}", headers=analyst_headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == created_id
        assert get_resp.json()["status"] == "NEW"

        # 6. POST /api/v1/alerts/{id}/acknowledge
        ack_resp = await client.post(f"/api/v1/alerts/{created_id}/acknowledge", headers=analyst_headers)
        assert ack_resp.status_code == 200
        assert ack_resp.json()["status"] == "ACKNOWLEDGED"

        # 7. PATCH /api/v1/alerts/{id} with illegal transition -> 400 Bad Request
        illegal_resp = await client.patch(
            f"/api/v1/alerts/{created_id}",
            headers=analyst_headers,
            json={"status": "NEW"} # Cannot transition back to NEW from ACKNOWLEDGED
        )
        assert illegal_resp.status_code == 400

        # 8. GET /api/v1/alerts list with filtering
        list_resp = await client.get("/api/v1/alerts?limit=10&severity=HIGH", headers=analyst_headers)
        assert list_resp.status_code == 200
        assert isinstance(list_resp.json(), list)
