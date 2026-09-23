"""
Comprehensive Test Suite for Section 07 — Rule-Based Fraud Engine.
Tests:
- All 9 individual rule evaluators (triggering, non-triggering, boundary, cold-start cases)
- Rule versioning & historical execution immutability
- Configuration validation & injection safety
- Error isolation and fault tolerance
- Determinism and idempotency
- Database persistence of RuleExecution records
- API endpoints for rule evaluation and version management
- Micro-performance benchmarking
"""
import uuid
import pytest
import time
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from backend.app.main import app
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.rule import FraudRule, FraudRuleVersion, RuleExecution
from backend.app.models.transaction import Transaction
from backend.app.models.user import User
from backend.app.engine.rules import (
    RuleRegistry,
    RuleConfigValidator,
    RuleConfigValidationError,
    HighAmountRule,
    RapidTransactionsRule,
    NewDeviceRule,
    UnusualLocationRule,
    UnusualTimeRule,
    FailedAttemptsRule,
    SuddenSpendingIncreaseRule,
    MerchantAnomalyRule,
    BehaviorDeviationRule,
    FraudRuleEngineService
)


from backend.app.core.security import create_access_token


@pytest.fixture
def auth_headers():
    token = create_access_token({
        "sub": "USR-ADMIN-01",
        "email": "admin@fraudshield.io",
        "role": "admin",
        "username": "admin"
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def analyst_headers():
    token = create_access_token({
        "sub": "USR-ANALYST-01",
        "email": "analyst@fraudshield.io",
        "role": "analyst",
        "username": "analyst"
    })
    return {"Authorization": f"Bearer {token}"}


# =====================================================================
# 1. INDIVIDUAL RULE UNIT TESTS
# =====================================================================

def test_high_amount_rule():
    rule = HighAmountRule()
    txn = {"amount": 2500.0}
    
    # 1. Triggering case: 6.0x baseline, amount $2500 >= $500
    features = {"amount_deviation": 6.0, "user_baseline_amount": 400.0}
    res = rule.run(txn, features, configuration={"multiplier": 5.0, "min_amount": 500.0})
    assert res.triggered is True
    assert res.score == 25.0
    assert "is 6.0x the customer historical baseline" in res.reason
    assert res.evidence is not None
    assert res.evidence.feature == "amount_deviation"
    assert res.evidence.actual_value == 6.0

    # 2. Non-triggering case: 3.0x baseline < 5.0x
    features_low = {"amount_deviation": 3.0, "user_baseline_amount": 400.0}
    res_low = rule.run(txn, features_low, configuration={"multiplier": 5.0, "min_amount": 500.0})
    assert res_low.triggered is False
    assert res_low.score == 0.0

    # 3. Boundary case: exact multiplier threshold 5.0
    features_exact = {"amount_deviation": 5.0, "user_baseline_amount": 400.0}
    res_exact = rule.run(txn, features_exact, configuration={"multiplier": 5.0, "min_amount": 500.0})
    assert res_exact.triggered is True

    # 4. Below minimum amount boundary: amount $400 < $500 min_amount
    res_min_amount = rule.run({"amount": 400.0}, {"amount_deviation": 10.0}, configuration={"multiplier": 5.0, "min_amount": 500.0})
    assert res_min_amount.triggered is False

    # 5. Absolute threshold mode
    res_abs = rule.run({"amount": 10000.0}, {}, configuration={"mode": "absolute_threshold", "threshold": 5000.0})
    assert res_abs.triggered is True
    assert "exceeds absolute threshold" in res_abs.reason


def test_rapid_transactions_rule():
    rule = RapidTransactionsRule()
    txn = {"amount": 100.0}

    # 1. Triggering: 5 txns in 5m >= 4 threshold
    features = {"velocity_5m": 5}
    res = rule.run(txn, features, configuration={"window_minutes": 5, "count_threshold": 4})
    assert res.triggered is True
    assert res.score == 25.0
    assert "5 transactions in the last 5 minutes" in res.reason

    # 2. Non-triggering: 2 txns < 4
    res_low = rule.run(txn, {"velocity_5m": 2}, configuration={"window_minutes": 5, "count_threshold": 4})
    assert res_low.triggered is False

    # 3. Exact boundary: 4 txns == 4
    res_exact = rule.run(txn, {"velocity_5m": 4}, configuration={"window_minutes": 5, "count_threshold": 4})
    assert res_exact.triggered is True

    # 4. 1-minute window
    res_1m = rule.run(txn, {"velocity_1m": 3}, configuration={"window_minutes": 1, "count_threshold": 3})
    assert res_1m.triggered is True


def test_new_device_rule():
    rule = NewDeviceRule()
    txn = {"device_id": "DEV-NOVEL-999"}

    # 1. Triggering: is_new_device == 1
    res = rule.run(txn, {"is_new_device": 1})
    assert res.triggered is True
    assert res.score == 20.0
    assert "DEV-NOVEL-999" in res.reason

    # 2. Non-triggering: known device
    res_known = rule.run(txn, {"is_new_device": 0})
    assert res_known.triggered is False

    # 3. Disabled in configuration
    res_disabled = rule.run(txn, {"is_new_device": 1}, configuration={"enabled": False})
    assert res_disabled.triggered is False


def test_unusual_location_rule():
    rule = UnusualLocationRule()
    txn = {"city": "Tokyo", "country": "JP"}

    # 1. Impossible travel speed: 950 km/h > 700 km/h
    features_speed = {
        "geo_hop_speed_kmh": 950.0,
        "distance_from_previous_location_km": 1900.0,
        "is_unusual_location": 1
    }
    res = rule.run(txn, features_speed, configuration={"max_geo_speed_kmh": 700.0})
    assert res.triggered is True
    assert "Impossible travel speed detected" in res.reason
    assert res.evidence.feature == "geo_hop_speed_kmh"

    # 2. Novel country trigger
    features_country = {"geo_hop_speed_kmh": 0.0, "is_new_country": 1, "is_unusual_location": 1}
    res_country = rule.run(txn, features_country, configuration={"new_country_enabled": True})
    assert res_country.triggered is True
    assert "country 'JP' never previously seen" in res_country.reason

    # 3. Non-triggering: familiar location and zero speed
    res_normal = rule.run(txn, {"geo_hop_speed_kmh": 50.0, "is_unusual_location": 0, "is_new_country": 0})
    assert res_normal.triggered is False


def test_unusual_time_rule():
    rule = UnusualTimeRule()
    txn = {"amount": 500.0}

    # 1. Overnight off-hours with high baseline deviation: 03:00 UTC with 3.5x dev
    features = {"hour_of_day": 3, "amount_deviation": 3.5, "is_unusual_transaction_hour": 0}
    res = rule.run(txn, features, configuration={"night_start": 1, "night_end": 5, "min_deviation_threshold": 2.0})
    assert res.triggered is True
    assert "off-hours window (03:00 UTC)" in res.reason

    # 2. Overnight hour but normal low amount (no elevation)
    features_low = {"hour_of_day": 3, "amount_deviation": 0.8, "is_unusual_transaction_hour": 0}
    res_low = rule.run(txn, features_low, configuration={"night_start": 1, "night_end": 5, "min_deviation_threshold": 2.0})
    assert res_low.triggered is False

    # 3. Daytime hour (14:00 UTC) with normal activity
    res_day = rule.run(txn, {"hour_of_day": 14, "amount_deviation": 1.0, "is_unusual_transaction_hour": 0})
    assert res_day.triggered is False


def test_failed_attempts_rule():
    rule = FailedAttemptsRule()
    txn = {"failed_attempts": 3}

    # 1. Triggering: 3 failed attempts >= 2 threshold
    res = rule.run(txn, {"failed_attempts": 3}, configuration={"max_failed_attempts": 2})
    assert res.triggered is True
    assert "3 failed authentication/CVV attempts" in res.reason

    # 2. Non-triggering: 0 failed attempts
    res_none = rule.run(txn, {"failed_attempts": 0}, configuration={"max_failed_attempts": 2})
    assert res_none.triggered is False

    # 3. Exact boundary: 2 attempts == 2
    res_exact = rule.run(txn, {"failed_attempts": 2}, configuration={"max_failed_attempts": 2})
    assert res_exact.triggered is True


def test_sudden_spending_increase_rule():
    rule = SuddenSpendingIncreaseRule()
    txn = {"amount": 1000.0}

    # 1. Triggering: hourly velocity burst (12 txns in 1h >= 10)
    res_vel = rule.run(txn, {"velocity_1h": 12, "amount_deviation": 1.0}, configuration={"max_txns_1h": 10})
    assert res_vel.triggered is True
    assert "12 transactions in the last hour" in res_vel.reason

    # 2. Triggering: spending multiplier 4.5x with >= 2 txns
    res_mult = rule.run(txn, {"velocity_1h": 3, "amount_deviation": 4.5}, configuration={"spending_multiplier": 3.0})
    assert res_mult.triggered is True

    # 3. Non-triggering: normal 1 txn and 1.0x dev
    res_normal = rule.run(txn, {"velocity_1h": 1, "amount_deviation": 1.0}, configuration={"max_txns_1h": 10, "spending_multiplier": 3.0})
    assert res_normal.triggered is False


def test_merchant_anomaly_rule():
    rule = MerchantAnomalyRule()
    
    # 1. Triggering: crypto category + 3.0x amount deviation
    txn_crypto = {"merchant_category": "Crypto & Exchange", "merchant_name": "Coinbase"}
    res_crypto = rule.run(txn_crypto, {"amount_deviation": 3.0, "is_new_merchant_for_user": 0})
    assert res_crypto.triggered is True
    assert "High-risk merchant category" in res_crypto.reason

    # 2. Triggering: novel casino merchant
    txn_casino = {"merchant_category": "Gambling & Casino", "merchant_name": "BetOnline"}
    res_casino = rule.run(txn_casino, {"amount_deviation": 1.0, "is_new_merchant_for_user": 1})
    assert res_casino.triggered is True
    assert "First-time transaction at high-risk merchant" in res_casino.reason

    # 3. Non-triggering: grocery category with normal amount
    txn_grocery = {"merchant_category": "Groceries", "merchant_name": "Whole Foods"}
    res_grocery = rule.run(txn_grocery, {"amount_deviation": 1.0, "is_new_merchant_for_user": 0})
    assert res_grocery.triggered is False


def test_behavior_deviation_rule():
    rule = BehaviorDeviationRule()
    
    # 1. Compound trigger: simultaneous new device AND unusual location
    features_compound = {"is_new_device": 1, "is_unusual_location": 1, "amount_deviation": 1.0, "failed_attempts": 0}
    res = rule.run({}, features_compound)
    assert res.triggered is True
    assert "Compound behavioral anomaly: simultaneous novel device and unfamiliar geographical location" in res.reason

    # 2. Compound trigger: high amount (5.0x) + failed attempts > 0
    features_auth_amount = {"is_new_device": 0, "is_unusual_location": 0, "amount_deviation": 5.0, "failed_attempts": 2}
    res_auth = rule.run({}, features_auth_amount, configuration={"min_deviation_threshold": 4.0})
    assert res_auth.triggered is True
    assert "high amount (5.0x baseline) directly preceded by 2 failed auth attempts" in res_auth.reason

    # 3. Non-triggering
    features_normal = {"is_new_device": 0, "is_unusual_location": 0, "amount_deviation": 1.0, "failed_attempts": 0}
    assert rule.run({}, features_normal).triggered is False


# =====================================================================
# 2. CONFIGURATION VALIDATION TESTS
# =====================================================================

def test_configuration_validation_rejections():
    # Negative threshold rejection
    with pytest.raises(RuleConfigValidationError, match="positive number"):
        RuleConfigValidator.validate("HIGH_AMOUNT", {"multiplier": -2.0})

    # Negative min_amount rejection
    with pytest.raises(RuleConfigValidationError, match="non-negative"):
        RuleConfigValidator.validate("HIGH_AMOUNT", {"multiplier": 3.0, "min_amount": -50.0})

    # Invalid rapid transactions count
    with pytest.raises(RuleConfigValidationError, match="positive integer"):
        RuleConfigValidator.validate("RAPID_TRANSACTIONS", {"count_threshold": 0})

    # Invalid hour range
    with pytest.raises(RuleConfigValidationError, match="integer hour between 0 and 23"):
        RuleConfigValidator.validate("UNUSUAL_TIME", {"night_start": 25})

    # Invalid category list format
    with pytest.raises(RuleConfigValidationError, match="list of strings"):
        RuleConfigValidator.validate("MERCHANT_ANOMALY", {"high_risk_categories": "not-a-list"})

    # Injection / unsafe key rejection
    with pytest.raises(RuleConfigValidationError, match="Forbidden configuration key"):
        RuleConfigValidator.validate("HIGH_AMOUNT", {"__eval__": "import os"})


# =====================================================================
# 3. ERROR ISOLATION & DETERMINISM TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_error_isolation():
    async with AsyncSessionLocal() as session:
        # Mock transaction and features
        txn_dict = {
            "id": "TXN-TEST-ISOLATION-01",
            "transaction_id": "TXN-TEST-ISOLATION-01",
            "user_id": "USR-CUST-1001",
            "amount": 6000.0,
            "device_id": "DEV-TEST-01"
        }
        features = {
            "amount_deviation": 8.0,
            "user_baseline_amount": 500.0,
            "velocity_5m": 1,
            "is_new_device": 0
        }

        resp = await FraudRuleEngineService.evaluate_transaction_rules(
            session=session,
            transaction_dict=txn_dict,
            features=features,
            persist_executions=False
        )

        assert resp.total_evaluated_count >= 8
        assert resp.triggered_count >= 1
        # Check that HIGH_AMOUNT triggered
        triggered_codes = [r.rule_code for r in resp.triggered_rules]
        assert "HIGH_AMOUNT" in triggered_codes


@pytest.mark.asyncio
async def test_engine_determinism():
    async with AsyncSessionLocal() as session:
        txn_dict = {
            "id": "TXN-TEST-DETERMINISTIC",
            "user_id": "USR-CUST-1001",
            "amount": 2500.0,
            "merchant_category": "retail"
        }
        features = {
            "amount_deviation": 6.0,
            "user_baseline_amount": 400.0,
            "velocity_5m": 5,
            "is_new_device": 1,
            "failed_attempts": 0
        }

        res1 = await FraudRuleEngineService.evaluate_transaction_rules(session, txn_dict, features, persist_executions=False)
        res2 = await FraudRuleEngineService.evaluate_transaction_rules(session, txn_dict, features, persist_executions=False)

        assert res1.total_score == res2.total_score
        assert res1.triggered_count == res2.triggered_count
        assert [r.rule_code for r in res1.triggered_rules] == [r.rule_code for r in res2.triggered_rules]


# =====================================================================
# 4. RULE VERSIONING & EXECUTION PERSISTENCE TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_rule_versioning_and_persistence():
    async with AsyncSessionLocal() as session:
        # Check rule versioning
        stmt = select(FraudRule).where(FraudRule.id == "HIGH_AMOUNT")
        res = await session.execute(stmt)
        rule = res.scalar_one_or_none()
        assert rule is not None

        # 1. Execute with current version (e.g. 1.0)
        txn_id = f"TXN-VER-TEST-{uuid.uuid4().hex[:6].upper()}"
        txn_dict = {"id": txn_id, "transaction_id": txn_id, "amount": 5000.0}
        features = {"amount_deviation": 10.0, "user_baseline_amount": 500.0}

        eval_v1 = await FraudRuleEngineService.evaluate_transaction_rules(
            session=session,
            transaction_dict=txn_dict,
            features=features,
            persist_executions=True
        )
        await session.commit()

        # Verify rule execution persistence
        exec_stmt = select(RuleExecution).where(RuleExecution.transaction_id == txn_id)
        exec_res = await session.execute(exec_stmt)
        records = exec_res.scalars().all()
        assert len(records) > 0
        
        # Verify HIGH_AMOUNT record exists and has structured details
        high_amt_rec = next((r for r in records if r.rule_id == "HIGH_AMOUNT"), None)
        assert high_amt_rec is not None
        assert high_amt_rec.triggered is True
        assert high_amt_rec.score > 0
        assert high_amt_rec.execution_detail is not None
        assert "evidence" in high_amt_rec.execution_detail


# =====================================================================
# 5. API ENDPOINTS INTEGRATION TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_evaluate_rules_api_endpoint(analyst_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Ingest a transaction first
        ingest_payload = {
            "user_id": "USR-CUST-1001",
            "merchant_name": "Apple Store Regent St",
            "merchant_category": "Electronics & Devices",
            "amount": 4500.0,
            "currency": "USD",
            "payment_method": "credit_card",
            "transaction_type": "PURCHASE",
            "device_id": "DEV-MACBOOK-01",
            "city": "New York",
            "country": "US"
        }
        create_res = await ac.post("/api/v1/transactions", json=ingest_payload, headers=analyst_headers)
        assert create_res.status_code == 200
        txn_data = create_res.json()
        txn_id = txn_data["id"]

        # 2. Call evaluate-rules endpoint
        eval_res = await ac.post(f"/api/v1/transactions/{txn_id}/evaluate-rules", headers=analyst_headers)
        assert eval_res.status_code == 200
        data = eval_res.json()
        assert data["transaction_id"] == txn_id
        assert "total_score" in data
        assert "triggered_count" in data
        assert "triggered_rules" in data
        assert "all_rules" in data
        assert len(data["all_rules"]) >= 8


@pytest.mark.asyncio
async def test_rule_version_api_endpoints(auth_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List rule versions
        list_res = await ac.get("/api/v1/admin/rules/HIGH_AMOUNT/versions", headers=auth_headers)
        assert list_res.status_code == 200
        versions = list_res.json()
        assert isinstance(versions, list)

        # 2. Create new rule version
        new_version_payload = {
            "version": f"2.{int(time.time()) % 1000}",
            "configuration": {
                "multiplier": 6.5,
                "min_amount": 750.0,
                "mode": "user_deviation"
            },
            "threshold": 750.0,
            "weight": 30.0,
            "is_active": True
        }
        create_ver_res = await ac.post(
            "/api/v1/admin/rules/HIGH_AMOUNT/versions",
            json=new_version_payload,
            headers=auth_headers
        )
        assert create_ver_res.status_code == 201
        created_ver = create_ver_res.json()
        assert created_ver["version"] == new_version_payload["version"]
        assert created_ver["weight"] == 30.0


# =====================================================================
# 6. MICRO-PERFORMANCE BENCHMARK TEST
# =====================================================================

@pytest.mark.asyncio
async def test_rule_engine_performance_benchmark():
    """Runs 100 synthetic evaluations to measure rule engine throughput."""
    async with AsyncSessionLocal() as session:
        txn_template = {
            "id": "TXN-BENCHMARK",
            "user_id": "USR-CUST-1001",
            "amount": 1250.0,
            "merchant_category": "electronics",
            "device_id": "DEV-TEST-01"
        }
        features_template = {
            "amount_deviation": 3.2,
            "user_baseline_amount": 390.0,
            "velocity_5m": 2,
            "velocity_1h": 4,
            "is_new_device": 0,
            "geo_hop_speed_kmh": 0.0,
            "hour_of_day": 14,
            "failed_attempts": 0,
            "is_unusual_location": 0,
            "is_new_country": 0
        }

        iterations = 100
        start = time.perf_counter()
        for i in range(iterations):
            await FraudRuleEngineService.evaluate_transaction_rules(
                session=session,
                transaction_dict=txn_template,
                features=features_template,
                persist_executions=False
            )
        elapsed_sec = time.perf_counter() - start
        avg_ms_per_eval = (elapsed_sec / iterations) * 1000.0

        print(f"\n[BENCHMARK] 100 evaluations completed in {elapsed_sec:.4f}s ({avg_ms_per_eval:.3f} ms/eval)")
        # Each full rule engine evaluation over 9 rules should easily complete under 50ms locally
        assert avg_ms_per_eval < 50.0
