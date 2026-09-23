"""
Unit and Integration Test Suite for Section 09 — Risk Engine.
Validates pure scoring logic, signal normalization, diminishing rule aggregation,
risk band boundary classification, explainability, versioning, database persistence,
idempotency, and API endpoints.
"""
import pytest
import math
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.main import app
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import create_access_token
from backend.app.models.transaction import Transaction
from backend.app.models.risk_score import RiskScore
from backend.app.models.user import User, Role
from backend.app.engine.risk.types import RiskLevel, CalculationStatus, RiskResult
from backend.app.engine.risk.config import RiskScoringConfig, default_risk_config, RISK_SCORING_VERSION
from backend.app.engine.risk.calculator import PureRiskCalculator
from backend.app.engine.risk.service import RiskEngineService
from backend.app.engine.pipeline import IngestionPipeline


# ---------------------------------------------------------------------------
# Pure Scoring & Boundary Classification Tests
# ---------------------------------------------------------------------------

def test_risk_band_boundary_classification():
    """Verify exact boundary behavior for LOW (0-30), MEDIUM (30.1-70), HIGH (70.1-90), CRITICAL (90.1-100)."""
    cfg = RiskScoringConfig()
    
    assert PureRiskCalculator.classify_risk_band(0.0, cfg) == RiskLevel.LOW
    assert PureRiskCalculator.classify_risk_band(1.0, cfg) == RiskLevel.LOW
    assert PureRiskCalculator.classify_risk_band(30.0, cfg) == RiskLevel.LOW
    
    assert PureRiskCalculator.classify_risk_band(30.1, cfg) == RiskLevel.MEDIUM
    assert PureRiskCalculator.classify_risk_band(50.0, cfg) == RiskLevel.MEDIUM
    assert PureRiskCalculator.classify_risk_band(70.0, cfg) == RiskLevel.MEDIUM
    
    assert PureRiskCalculator.classify_risk_band(70.1, cfg) == RiskLevel.HIGH
    assert PureRiskCalculator.classify_risk_band(85.0, cfg) == RiskLevel.HIGH
    assert PureRiskCalculator.classify_risk_band(90.0, cfg) == RiskLevel.HIGH
    
    assert PureRiskCalculator.classify_risk_band(90.1, cfg) == RiskLevel.CRITICAL
    assert PureRiskCalculator.classify_risk_band(99.0, cfg) == RiskLevel.CRITICAL
    assert PureRiskCalculator.classify_risk_band(100.0, cfg) == RiskLevel.CRITICAL


def test_score_clamping_bounds():
    """Verify that calculated score is strictly clamped to [0.0, 100.0]."""
    txn = {"id": "TX-CLAMP-1"}
    
    # Overwhelming extreme signals
    rules = [
        {"rule_code": f"R_{i}", "points": 100.0, "severity": "CRITICAL"}
        for i in range(10)
    ]
    res = PureRiskCalculator.calculate_risk(
        transaction_dict=txn,
        features={"velocity_5m": 100, "is_new_device": 1, "is_unusual_location": 1, "is_new_country": 1, "failed_attempts": 10},
        triggered_rules=rules,
        ml_anomaly_score=1.0
    )
    assert res.risk_score <= 100.0
    assert res.risk_score >= 0.0
    assert res.risk_level == RiskLevel.CRITICAL

    # Zero signals
    res_zero = PureRiskCalculator.calculate_risk(
        transaction_dict=txn,
        features={},
        triggered_rules=[],
        ml_anomaly_score=0.0
    )
    assert res_zero.risk_score == 0.0
    assert res_zero.risk_level == RiskLevel.LOW


def test_rule_aggregation_diminishing_contributions():
    """Verify anti-inflation diminishing aggregation of multiple triggered rules."""
    cfg = RiskScoringConfig(diminishing_factor=0.60)
    
    # Rule 1: 50 pts, Rule 2: 40 pts, Rule 3: 30 pts
    rules = [
        {"rule_code": "R1", "score": 50.0, "severity": "MEDIUM"},
        {"rule_code": "R2", "score": 40.0, "severity": "LOW"},
        {"rule_code": "R3", "score": 30.0, "severity": "LOW"},
    ]
    # Expected rule score = (50 * 1.0) + (40 * 0.60) + (30 * 0.36) = 50 + 24 + 10.8 = 84.8
    score, factors = PureRiskCalculator.aggregate_rule_score(rules, cfg)
    assert pytest.approx(score, 0.1) == 84.8
    assert len(factors) == 3
    assert factors[0].contribution == 50.0
    assert factors[1].contribution == 24.0
    assert factors[2].contribution == 10.8


def test_severity_floor_overrides():
    """Verify CRITICAL (91.0) and HIGH (71.0) severity floor guarantees."""
    txn = {"id": "TX-SEV-1"}
    
    # Low score rule but marked as CRITICAL severity
    rules_critical = [{"rule_code": "SANCTION_HIT", "points": 10.0, "severity": "CRITICAL"}]
    res_crit = PureRiskCalculator.calculate_risk(
        transaction_dict=txn,
        features={},
        triggered_rules=rules_critical,
        ml_anomaly_score=0.0
    )
    assert res_crit.risk_score >= 91.0
    assert res_crit.risk_level == RiskLevel.CRITICAL

    # Low score rule but marked as HIGH severity
    rules_high = [{"rule_code": "NEW_HIGH_RISK_GEO", "points": 10.0, "severity": "HIGH"}]
    res_high = PureRiskCalculator.calculate_risk(
        transaction_dict=txn,
        features={},
        triggered_rules=rules_high,
        ml_anomaly_score=0.0
    )
    assert res_high.risk_score >= 71.0
    assert res_high.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)


def test_missing_ml_signal_fallback_and_partial_status():
    """Verify graceful handling when ML signal is missing or NaN."""
    txn = {"id": "TX-NO-ML"}
    rules = [{"rule_code": "RULE_AMOUNT", "points": 60.0, "severity": "MEDIUM"}]
    
    # ML is None
    res = PureRiskCalculator.calculate_risk(
        transaction_dict=txn,
        features={},
        triggered_rules=rules,
        ml_anomaly_score=None
    )
    assert res.status == CalculationStatus.PARTIAL
    assert res.ml_score == 0.0
    assert res.risk_score > 0.0

    # ML is NaN
    res_nan = PureRiskCalculator.calculate_risk(
        transaction_dict=txn,
        features={},
        triggered_rules=rules,
        ml_anomaly_score=float("nan")
    )
    assert res_nan.status == CalculationStatus.PARTIAL
    assert res_nan.ml_score == 0.0


def test_explainability_factor_integrity():
    """Verify explanations accurately map to real triggered inputs with structured evidence."""
    txn = {"id": "TX-EXPLAIN-1"}
    features = {
        "velocity_5m": 5,
        "is_new_device": 1,
        "is_unusual_location": 0,
        "is_new_country": 0,
        "failed_attempts": 2
    }
    rules = [
        {"rule_code": "RULE_HIGH_AMOUNT", "rule_name": "High Transaction Amount", "points": 80.0, "severity": "HIGH", "reason": "Amount exceeds threshold."}
    ]
    
    res = PureRiskCalculator.calculate_risk(
        transaction_dict=txn,
        features=features,
        triggered_rules=rules,
        ml_anomaly_score=0.88
    )
    
    factor_codes = [f.code for f in res.factors]
    assert "RULE_HIGH_AMOUNT" in factor_codes
    assert "ML_ISOLATION_FOREST" in factor_codes
    assert "BEHAVIOR_VELOCITY" in factor_codes
    assert "BEHAVIOR_NOVELTY" in factor_codes
    assert "BEHAVIOR_FAILED_AUTH" in factor_codes
    
    # Verify no un-triggered factors are present
    assert not any(f.code == "RULE_UNTRIGGERED" for f in res.factors)


def test_deterministic_scoring_reproducibility():
    """Verify that multiple calculations on identical inputs yield 100% bit-exact results."""
    txn = {"id": "TX-DET-1", "amount": 5420.0}
    features = {"velocity_5m": 3, "is_new_device": 1}
    rules = [{"rule_code": "R1", "points": 50.0, "severity": "MEDIUM"}]
    ml_score = 0.725
    
    res1 = PureRiskCalculator.calculate_risk(txn, features, rules, ml_score)
    res2 = PureRiskCalculator.calculate_risk(txn, features, rules, ml_score)
    
    assert res1.risk_score == res2.risk_score
    assert res1.rule_score == res2.rule_score
    assert res1.ml_score == res2.ml_score
    assert res1.behavior_score == res2.behavior_score
    assert res1.risk_level == res2.risk_level
    assert len(res1.factors) == len(res2.factors)


def test_config_validation_rules():
    """Verify Pydantic validation rejects invalid threshold ordering."""
    with pytest.raises(Exception):
        # threshold_medium < threshold_low should fail validation
        RiskScoringConfig(threshold_low=50.0, threshold_medium=30.0)

    with pytest.raises(Exception):
        # threshold_high < threshold_medium should fail validation
        RiskScoringConfig(threshold_low=30.0, threshold_medium=80.0, threshold_high=60.0)


# ---------------------------------------------------------------------------
# Database Persistence & Idempotency Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_risk_score_persistence_and_idempotency():
    """Verify persisting risk evaluation and subsequent idempotent updates."""
    async with AsyncSessionLocal() as session:
        txn_id = f"TX-PERSIST-{uuid.uuid4().hex[:8]}"
        
        # 1. Create a dummy transaction
        txn = Transaction(
            id=txn_id,
            transaction_id=txn_id,
            user_id="USR-CUST-1001",
            merchant_id="MERCH-AMAZON",
            device_id="DEV-MOBILE-01",
            amount=1500.0,
            currency="USD",
            payment_method="CREDIT_CARD",
            timestamp=datetime.now(timezone.utc),
            status="PENDING"
        )
        session.add(txn)
        await session.commit()

        # 2. First evaluation and persistence
        res1 = await RiskEngineService.evaluate_and_persist_transaction_risk(
            session=session,
            transaction_dict={"id": txn_id, "amount": 1500.0},
            features={"velocity_5m": 2},
            triggered_rules=[{"rule_code": "R_AMOUNT", "points": 50.0, "severity": "MEDIUM"}],
            ml_anomaly_score=0.45,
            persist=True
        )
        await session.commit()

        # Check DB record
        stmt = select(RiskScore).where(RiskScore.transaction_id == txn_id)
        db_res = await session.execute(stmt)
        record = db_res.scalar_one_or_none()
        assert record is not None
        assert record.score == res1.risk_score
        assert record.risk_level == res1.risk_level.value
        assert record.scoring_version == RISK_SCORING_VERSION
        assert len(record.explanation) >= 2

        # 3. Second evaluation (Idempotent update without duplicate key error)
        res2 = await RiskEngineService.evaluate_and_persist_transaction_risk(
            session=session,
            transaction_dict={"id": txn_id, "amount": 1500.0},
            features={"velocity_5m": 5},
            triggered_rules=[{"rule_code": "R_AMOUNT", "points": 90.0, "severity": "HIGH"}],
            ml_anomaly_score=0.92,
            persist=True
        )
        await session.commit()

        # Check updated record
        db_res2 = await session.execute(stmt)
        record2 = db_res2.scalar_one_or_none()
        assert record2 is not None
        assert record2.score == res2.risk_score
        assert record2.score != res1.risk_score


# ---------------------------------------------------------------------------
# End-to-End Ingestion Pipeline Integration Test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_pipeline_integration_with_risk_engine():
    """Verify that IngestionPipeline seamlessly runs Feature Store -> Rules -> ML -> Risk Engine."""
    async with AsyncSessionLocal() as session:
        txn_id = f"TX-PIPE-{uuid.uuid4().hex[:8]}"
        txn_payload = {
            "transaction_id": txn_id,
            "user_id": "USR-CUST-1001",
            "merchant_id": "MERCH-AMAZON",
            "merchant_name": "Amazon Web Retail",
            "merchant_category": "Electronics & Retail",
            "device_id": "DEV-MOBILE-01",
            "amount": 7500.0,
            "currency": "USD",
            "channel": "ONLINE",
            "payment_method": "CREDIT_CARD",
            "location_country": "US",
            "city": "New York",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Process through full ingestion pipeline
        txn_record, alert_record = await IngestionPipeline.process_transaction(session, txn_payload)
        await session.commit()

        assert txn_record.risk_score is not None
        assert txn_record.risk_level in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
        assert 0.0 <= txn_record.risk_score <= 100.0

        # Verify risk score persistence in DB
        stmt = select(RiskScore).where(RiskScore.transaction_id == txn_record.id)
        db_res = await session.execute(stmt)
        record = db_res.scalar_one_or_none()
        assert record is not None
        assert record.score == txn_record.risk_score


# ---------------------------------------------------------------------------
# API Endpoints Integration Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_risk_api_endpoints():
    """Verify GET /risk/config, PATCH /risk/config, POST /risk/evaluate, and GET /risk/transaction/{id}."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Generate Auth Tokens with real seeded user IDs
        admin_token = create_access_token(data={"sub": "USR-ADMIN-01", "role": "ADMIN", "roles": ["ADMIN"]})
        analyst_token = create_access_token(data={"sub": "USR-ANALYST-01", "role": "ANALYST", "roles": ["ANALYST"]})
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        analyst_headers = {"Authorization": f"Bearer {analyst_token}"}

        # 2. Test GET /api/v1/risk/config
        cfg_resp = await client.get("/api/v1/risk/config", headers=analyst_headers)
        assert cfg_resp.status_code == 200
        cfg_data = cfg_resp.json()
        assert "rule_weight" in cfg_data
        assert "threshold_low" in cfg_data
        assert cfg_data["scoring_version"] == RISK_SCORING_VERSION

        # 3. Test PATCH /api/v1/risk/config (Admin authorized)
        update_resp = await client.patch(
            "/api/v1/risk/config",
            headers=admin_headers,
            json={"diminishing_factor": 0.65, "threshold_low": 32.0}
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["diminishing_factor"] == 0.65
        assert update_resp.json()["threshold_low"] == 32.0

        # Reset back
        await client.patch(
            "/api/v1/risk/config",
            headers=admin_headers,
            json={"diminishing_factor": 0.60, "threshold_low": 30.0}
        )

        # 4. Test PATCH /api/v1/risk/config (Analyst unauthorized)
        unauth_resp = await client.patch(
            "/api/v1/risk/config",
            headers=analyst_headers,
            json={"threshold_low": 25.0}
        )
        assert unauth_resp.status_code == 403

        # 5. Test POST /api/v1/risk/evaluate with payload
        eval_resp = await client.post(
            "/api/v1/risk/evaluate",
            headers=analyst_headers,
            json={
                "transaction_data": {"id": "TX-API-EVAL-1", "amount": 200.0},
                "features": {"velocity_5m": 1},
                "triggered_rules": [{"rule_code": "R_SAMPLE", "points": 40.0, "severity": "MEDIUM"}],
                "ml_anomaly_score": 0.35,
                "persist": False
            }
        )
        assert eval_resp.status_code == 200
        eval_data = eval_resp.json()
        assert eval_data["transaction_id"] == "TX-API-EVAL-1"
        assert 0.0 <= eval_data["risk_score"] <= 100.0
        assert len(eval_data["factors"]) >= 2

        # 6. Test GET /api/v1/risk/transaction/{id} for 404
        not_found_resp = await client.get("/api/v1/risk/transaction/TX-NONEXISTENT", headers=analyst_headers)
        assert not_found_resp.status_code == 404


def test_performance_scoring_latency():
    """Verify pure risk calculation micro-benchmark executes within < 5ms."""
    import time
    txn = {"id": "TX-BENCH-1"}
    features = {"velocity_5m": 4, "is_new_device": 1, "is_unusual_location": 1}
    rules = [
        {"rule_code": f"RULE_{i}", "points": 50.0, "severity": "MEDIUM"}
        for i in range(5)
    ]
    
    start = time.perf_counter()
    for _ in range(100):
        PureRiskCalculator.calculate_risk(txn, features, rules, ml_anomaly_score=0.85)
    avg_duration_ms = ((time.perf_counter() - start) / 100) * 1000.0
    
    assert avg_duration_ms < 5.0, f"Average calculation took {avg_duration_ms:.3f}ms (expected < 5ms)"
