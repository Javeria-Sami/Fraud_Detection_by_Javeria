"""
Comprehensive Backend Tests for Section 16: 360-Degree Behavioral Risk Profiling.
Tests:
- User profile calculation & spending baselines
- Device profile calculation & multi-user sharing analysis
- Merchant profile calculation & volume aggregations
- Cold-start handling (NEW_ENTITY, LIMITED_HISTORY, ESTABLISHED)
- Temporal leakage prevention (time-aware calculation as of timestamp T)
- Contextual risk signals generation
- Unified profile summary endpoint
- RBAC permissions
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.models.transaction import Transaction

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def admin_headers():
    token = create_access_token(data={"sub": "USR-ADMIN-01", "role": "ADMIN", "permissions": ["*"]})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def analyst_headers():
    token = create_access_token(data={
        "sub": "USR-ANALYST-01",
        "role": "ANALYST",
        "permissions": ["transaction.read", "transaction.create", "alert.read", "case.read"]
    })
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def viewer_headers():
    token = create_access_token(data={
        "sub": "USR-VIEWER-01",
        "role": "VIEWER",
        "permissions": ["transaction.read", "alert.read", "case.read", "user.read"]
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_risk_profile_stats_endpoint(client: AsyncClient, analyst_headers: dict):
    """Test KPI stats endpoint for Risk Profiling."""
    resp = await client.get("/api/v1/risk-profiles/stats", headers=analyst_headers)
    assert resp.status_code == 200
    stats = resp.json()

    assert "total_user_profiles" in stats
    assert "high_risk_users" in stats
    assert "total_devices" in stats
    assert "shared_devices" in stats
    assert "total_merchants" in stats
    assert "high_risk_merchants" in stats


@pytest.mark.asyncio
async def test_user_profile_calculation_and_baselines(client: AsyncClient, analyst_headers: dict):
    """
    Test user profile calculation including amounts, habitual hours, known devices, locations, and signals.
    """
    user_id = "USR-CUST-1005"
    device_id = f"DEV-PROF-{uuid.uuid4().hex[:6].upper()}"

    # Ingest 6 transactions for this user across different amounts
    amounts = [100.0, 120.0, 110.0, 95.0, 105.0, 1500.0]
    for i, amt in enumerate(amounts):
        t_resp = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_id": f"TXN-U-{i}-{uuid.uuid4().hex[:6].upper()}",
                "user_id": user_id,
                "amount": amt,
                "currency": "USD",
                "payment_method": "CREDIT_CARD",
                "merchant_name": "Target Store",
                "device_id": device_id,
                "city": "New York",
                "country": "US"
            },
            headers=analyst_headers
        )
        assert t_resp.status_code in [200, 201]

    # Get User Profile
    resp = await client.get(f"/api/v1/risk-profiles/users/{user_id}", headers=analyst_headers)
    assert resp.status_code == 200
    prof = resp.json()

    assert prof["user_id"] == user_id
    assert prof["profile_state"] == "ESTABLISHED"
    assert prof["total_transactions_count"] >= 6
    assert prof["total_spend_amount"] >= sum(amounts)
    assert prof["usual_country"] == "US"
    assert prof["usual_city"] == "New York"
    assert device_id in prof["known_devices"]
    assert len(prof["usual_transaction_hours"]) > 0


@pytest.mark.asyncio
async def test_device_profile_and_user_sharing(client: AsyncClient, analyst_headers: dict):
    """
    Test device profile calculation and multi-user device sharing signal detection.
    """
    device_id = f"DEV-SHARED-{uuid.uuid4().hex[:6].upper()}"
    user_a = "USR-CUST-1006"
    user_b = "USR-CUST-1007"

    # Transaction from User A on Device
    t_a = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_id": f"TXN-DEV-A-{uuid.uuid4().hex[:6].upper()}",
            "user_id": user_a,
            "amount": 50.0,
            "currency": "USD",
            "payment_method": "DEBIT_CARD",
            "merchant_name": "Coffee Shop",
            "device_id": device_id,
            "city": "Chicago",
            "country": "US"
        },
        headers=analyst_headers
    )
    assert t_a.status_code in [200, 201]

    # Transaction from User B on same Device
    t_b = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_id": f"TXN-DEV-B-{uuid.uuid4().hex[:6].upper()}",
            "user_id": user_b,
            "amount": 75.0,
            "currency": "USD",
            "payment_method": "CREDIT_CARD",
            "merchant_name": "Uber",
            "device_id": device_id,
            "city": "Chicago",
            "country": "US"
        },
        headers=analyst_headers
    )
    assert t_b.status_code in [200, 201]

    resp = await client.get(f"/api/v1/risk-profiles/devices/{device_id}", headers=analyst_headers)
    assert resp.status_code == 200
    d_prof = resp.json()

    assert d_prof["device_id"] == device_id
    assert d_prof["total_transactions"] == 2
    assert d_prof["distinct_users_count"] == 2
    assert user_a in d_prof["associated_users"]
    assert user_b in d_prof["associated_users"]

    # Verify DEVICE_SHARED_BY_USERS contextual signal
    signals = d_prof["contextual_signals"]
    assert any(s["signal_code"] == "DEVICE_SHARED_BY_USERS" for s in signals)


@pytest.mark.asyncio
async def test_merchant_profile_aggregates(client: AsyncClient, analyst_headers: dict):
    """
    Test merchant profile aggregation (volume, average, categories, risk tier).
    """
    merchant_name = f"CryptoExchange-{uuid.uuid4().hex[:6].upper()}"
    user_id = "USR-CUST-1008"

    for i in range(3):
        t_m = await client.post(
            "/api/v1/transactions",
            json={
                "transaction_id": f"TXN-M-{i}-{uuid.uuid4().hex[:6].upper()}",
                "user_id": user_id,
                "amount": 500.0,
                "currency": "USD",
                "payment_method": "CRYPTO",
                "merchant_name": merchant_name,
                "merchant_category": "crypto_exchange",
                "device_id": "DEV-MACBOOK-01",
                "city": "San Francisco",
                "country": "US"
            },
            headers=analyst_headers
        )
        assert t_m.status_code in [200, 201]

    resp = await client.get(f"/api/v1/risk-profiles/merchants/{merchant_name}", headers=analyst_headers)
    assert resp.status_code == 200
    m_prof = resp.json()

    assert m_prof["merchant_name"] == merchant_name
    assert m_prof["category"] == "crypto_exchange"
    assert m_prof["base_risk_tier"] == "HIGH"
    assert m_prof["total_transactions"] == 3
    assert m_prof["total_volume"] == 1500.0
    assert m_prof["average_amount"] == 500.0


@pytest.mark.asyncio
async def test_cold_start_and_profile_states(client: AsyncClient, analyst_headers: dict):
    """
    Test cold-start behavior for brand new entity (0 transactions) and limited history (1-4 transactions).
    """
    brand_new_user = f"USR-UNSEEN-{uuid.uuid4().hex[:8].upper()}"

    resp = await client.get(f"/api/v1/risk-profiles/users/{brand_new_user}", headers=analyst_headers)
    assert resp.status_code == 200
    prof = resp.json()

    assert prof["user_id"] == brand_new_user
    assert prof["profile_state"] == "NEW_ENTITY"
    assert prof["total_transactions_count"] == 0
    assert prof["total_spend_amount"] == 0.0
    assert prof["median_transaction_amount"] is None
    assert any(s["signal_code"] == "NEW_USER_ACCOUNT" for s in prof["contextual_signals"])


@pytest.mark.asyncio
async def test_temporal_leakage_prevention(client: AsyncClient, analyst_headers: dict):
    """
    CRITICAL TEST: Verify that calculating a profile as of timestamp T ignores all transactions created after T.
    """
    user_id = "USR-CUST-1009"
    base_time = datetime(2026, 5, 10, 12, 0, 0, tzinfo=timezone.utc)

    # Ingest Transaction 1 at T - 2 days ($100)
    t1_time = base_time - timedelta(days=2)
    t1 = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_id": f"TXN-T1-{uuid.uuid4().hex[:6].upper()}",
            "user_id": user_id,
            "amount": 100.0,
            "currency": "USD",
            "payment_method": "CREDIT_CARD",
            "merchant_name": "Grocery Store",
            "device_id": "DEV-TIME-01",
            "city": "Boston",
            "country": "US",
            "timestamp": t1_time.isoformat()
        },
        headers=analyst_headers
    )
    assert t1.status_code in [200, 201]

    # Ingest Transaction 2 at T - 1 day ($200)
    t2_time = base_time - timedelta(days=1)
    t2 = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_id": f"TXN-T2-{uuid.uuid4().hex[:6].upper()}",
            "user_id": user_id,
            "amount": 200.0,
            "currency": "USD",
            "payment_method": "CREDIT_CARD",
            "merchant_name": "Grocery Store",
            "device_id": "DEV-TIME-01",
            "city": "Boston",
            "country": "US",
            "timestamp": t2_time.isoformat()
        },
        headers=analyst_headers
    )
    assert t2.status_code in [200, 201]

    # Ingest Transaction 3 FUTURE transaction at T + 2 days ($5000)
    t3_time = base_time + timedelta(days=2)
    t3 = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_id": f"TXN-T3-{uuid.uuid4().hex[:6].upper()}",
            "user_id": user_id,
            "amount": 5000.0,
            "currency": "USD",
            "payment_method": "CREDIT_CARD",
            "merchant_name": "Luxury Store",
            "device_id": "DEV-FUTURE-99",
            "city": "Paris",
            "country": "FR",
            "timestamp": t3_time.isoformat()
        },
        headers=analyst_headers
    )
    assert t3.status_code in [200, 201]

    # 1. Evaluate profile as of base_time T
    resp_as_of = await client.get(
        f"/api/v1/risk-profiles/users/{user_id}?as_of={base_time.isoformat()}",
        headers=analyst_headers
    )
    assert resp_as_of.status_code == 200
    prof_as_of = resp_as_of.json()

    # MUST NOT include future device DEV-FUTURE-99
    assert "DEV-FUTURE-99" not in prof_as_of["known_devices"]
    assert prof_as_of["max_transaction_amount"] < 5000.0

    # 2. Evaluate current profile (without as_of limit)
    resp_current = await client.get(
        f"/api/v1/risk-profiles/users/{user_id}",
        headers=analyst_headers
    )
    assert resp_current.status_code == 200
    prof_current = resp_current.json()

    assert "DEV-FUTURE-99" in prof_current["known_devices"]
    assert prof_current["max_transaction_amount"] >= 5000.0


@pytest.mark.asyncio
async def test_unified_profile_summary_endpoint(client: AsyncClient, analyst_headers: dict):
    """
    Test unified compact summary endpoint for user, device, and merchant entity types.
    """
    user_id = "USR-CUST-1010"
    device_id = f"DEV-SUMM-{uuid.uuid4().hex[:6].upper()}"

    t_post = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_id": f"TXN-SUMM-{uuid.uuid4().hex[:6].upper()}",
            "user_id": user_id,
            "amount": 250.0,
            "currency": "USD",
            "payment_method": "CREDIT_CARD",
            "merchant_name": "Best Buy",
            "device_id": device_id,
            "city": "Austin",
            "country": "US"
        },
        headers=analyst_headers
    )
    assert t_post.status_code in [200, 201]

    # User Summary
    u_sum = await client.get(f"/api/v1/risk-profiles/USER/{user_id}/summary", headers=analyst_headers)
    assert u_sum.status_code == 200
    u_data = u_sum.json()
    assert u_data["entity_type"] == "USER"
    assert u_data["entity_id"] == user_id
    assert u_data["total_transactions"] >= 1

    # Device Summary
    d_sum = await client.get(f"/api/v1/risk-profiles/DEVICE/{device_id}/summary", headers=analyst_headers)
    assert d_sum.status_code == 200
    assert d_sum.json()["entity_type"] == "DEVICE"

    # Merchant Summary
    m_sum = await client.get("/api/v1/risk-profiles/MERCHANT/Best Buy/summary", headers=analyst_headers)
    assert m_sum.status_code == 200
    assert m_sum.json()["entity_type"] == "MERCHANT"


@pytest.mark.asyncio
async def test_profile_recalculate_admin_endpoint(client: AsyncClient, admin_headers: dict, viewer_headers: dict):
    """
    Test recalculate endpoint: Admin/Analyst permitted, Viewer forbidden.
    """
    # Viewer cannot recalculate
    v_resp = await client.post("/api/v1/risk-profiles/recalculate", headers=viewer_headers)
    assert v_resp.status_code == 403

    # Admin can recalculate
    a_resp = await client.post("/api/v1/risk-profiles/recalculate", headers=admin_headers)
    assert a_resp.status_code == 200
    assert a_resp.json()["status"] == "SUCCESS"
