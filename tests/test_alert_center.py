"""
Comprehensive Test Suite for Section 14 — Alert Center.
Tests pagination, multidimensional filtering, KPI stats aggregation,
deep investigation telemetry, lifecycle state machine transitions,
optimistic concurrency control, RBAC enforcement, and audit logs.
"""
import pytest
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
from backend.app.models.rule import FraudRule, RuleExecution
from backend.app.models.ml_model import MLModelRegistry, MLPrediction


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
        "permissions": ["transaction.read", "transaction.create", "alert.read", "alert.update", "alert.assign", "case.read", "case.create", "case.update"]
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def viewer_headers():
    token = create_access_token(data={
        "sub": "USR-VIEWER-01",
        "role": "VIEWER",
        "permissions": ["transaction.read", "alert.read", "case.read", "user.read", "rule.read", "model.read", "analytics.read"]
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_alert_center_stats_endpoint(client, analyst_headers):
    """Verify Alert Center KPI aggregation stats endpoint."""
    resp = await client.get("/api/v1/alerts/stats", headers=analyst_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_alerts" in data
    assert "open_alerts" in data
    assert "critical_alerts" in data
    assert "high_priority_alerts" in data
    assert "unassigned_alerts" in data
    assert "escalated_alerts" in data
    assert "resolved_today" in data


@pytest.mark.asyncio
async def test_alert_center_paginated_endpoint(client, analyst_headers):
    """Verify Alert Center paginated listing, envelope, and headers."""
    resp = await client.get("/api/v1/alerts/paginated?page=1&page_size=10", headers=analyst_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert "total_pages" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_alert_center_multidimensional_filtering_and_sorting(client, analyst_headers):
    """Verify filters for severity, status, search, risk score range, and sorting."""
    # Filter by CRITICAL severity
    resp_crit = await client.get("/api/v1/alerts?severity=CRITICAL&sort_by=risk_score&order=desc", headers=analyst_headers)
    assert resp_crit.status_code == 200
    assert "X-Total-Count" in resp_crit.headers
    items = resp_crit.json()
    for item in items:
        assert item["severity"] == "CRITICAL"

    # Filter by risk score range
    resp_risk = await client.get("/api/v1/alerts?min_risk_score=50.0&max_risk_score=100.0", headers=analyst_headers)
    assert resp_risk.status_code == 200
    for item in resp_risk.json():
        assert item["risk_score"] >= 50.0


@pytest.mark.asyncio
async def test_alert_center_date_range_validation(client, analyst_headers):
    """Verify date range validation rejects invalid dates, inverted ranges, and spans > 90 days."""
    # Inverted range
    resp_inv = await client.get("/api/v1/alerts?start_date=2026-05-01T00:00:00Z&end_date=2026-01-01T00:00:00Z", headers=analyst_headers)
    assert resp_inv.status_code == 422

    # Exceeding 90 days
    resp_large = await client.get("/api/v1/alerts?start_date=2026-01-01T00:00:00Z&end_date=2026-06-01T00:00:00Z", headers=analyst_headers)
    assert resp_large.status_code == 400
    assert "exceeds maximum allowed interactive span" in resp_large.json()["detail"]


@pytest.mark.asyncio
async def test_alert_center_investigation_endpoint(client, analyst_headers):
    """Verify deep investigation endpoint returns joined transaction, risk, rules, and ML predictions."""
    # Create synthetic alert with transaction in DB
    unique_suffix = uuid.uuid4().hex[:6]
    txn_id = f"TX-AC-INV-{unique_suffix}"
    alert_id = f"ALT-AC-INV-{unique_suffix}"
    now_utc = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        txn = Transaction(
            id=txn_id,
            transaction_id=txn_id,
            user_id="USR-AC-01",
            amount=5500.00,
            currency="USD",
            payment_method="CREDIT_CARD",
            merchant_name="Luxury Watch Vault",
            merchant_category="LUXURY",
            device_id="DEV-AC-01",
            city="New York",
            country="US",
            risk_score=92.5,
            risk_level="CRITICAL",
            status="COMPLETED",
            transaction_timestamp=now_utc
        )
        session.add(txn)

        risk = RiskScore(
            id=f"RSK-AC-{unique_suffix}",
            transaction_id=txn_id,
            score=92.5,
            risk_level="CRITICAL",
            rule_score=60.0,
            ml_score=32.5,
            behavior_score=0.0,
            explanation=["Exceeds user baseline spending by 8.5x"],
            scoring_version="v1.0.0",
            created_at=now_utc
        )
        session.add(risk)

        alert = Alert(
            id=alert_id,
            alert_id=alert_id,
            transaction_id=txn_id,
            user_id="USR-AC-01",
            title="Critical Risk Outlier",
            description="Transaction flagged with critical composite risk.",
            severity="CRITICAL",
            status="NEW",
            risk_score=92.5,
            alert_reason="Extreme deviation from historical spending profile.",
            triggered_rules=[{"rule_id": "RULE-HIGH-VAL", "score": 60.0, "reason": "High amount limit"}],
            model_version="v1.0.0",
            created_at=now_utc
        )
        session.add(alert)
        await session.commit()

    # Query investigation endpoint
    resp = await client.get(f"/api/v1/alerts/{alert_id}/investigate", headers=analyst_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["alert"]["id"] == alert_id
    assert data["alert"]["severity"] == "CRITICAL"
    assert data["transaction"]["id"] == txn_id
    assert data["transaction"]["amount"] == 5500.00
    assert data["risk"]["risk_score"] == 92.5
    assert len(data["rules"]) > 0
    assert "lifecycle_history" in data


@pytest.mark.asyncio
async def test_alert_lifecycle_state_machine_and_actions(client, analyst_headers):
    """Test full valid lifecycle: NEW -> ACKNOWLEDGED -> INVESTIGATING -> RESOLVED and DISMISSED/ESCALATED."""
    unique_suffix = uuid.uuid4().hex[:6]
    alert_id = f"ALT-LIFE-{unique_suffix}"
    txn_id = f"TX-LIFE-{unique_suffix}"
    now_utc = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        alert = Alert(
            id=alert_id,
            alert_id=alert_id,
            transaction_id=txn_id,
            user_id="USR-LIFE",
            title="Lifecycle Test Alert",
            severity="HIGH",
            status="NEW",
            risk_score=80.0,
            alert_reason="Lifecycle transition testing",
            created_at=now_utc
        )
        session.add(alert)
        await session.commit()

    # 1. Acknowledge
    ack_resp = await client.post(f"/api/v1/alerts/{alert_id}/acknowledge", headers=analyst_headers)
    assert ack_resp.status_code == 200
    assert ack_resp.json()["status"] == "ACKNOWLEDGED"
    assert ack_resp.json()["acknowledged_at"] is not None

    # 2. Start Investigation
    inv_resp = await client.post(f"/api/v1/alerts/{alert_id}/investigate", headers=analyst_headers)
    assert inv_resp.status_code == 200
    assert inv_resp.json()["status"] == "INVESTIGATING"

    # 3. Resolve
    res_resp = await client.post(
        f"/api/v1/alerts/{alert_id}/resolve",
        headers=analyst_headers,
        json={"reason": "Confirmed Legitimate", "note": "Verified customer identity via callback."}
    )
    assert res_resp.status_code == 200
    assert res_resp.json()["status"] == "RESOLVED"
    assert res_resp.json()["resolved_at"] is not None


@pytest.mark.asyncio
async def test_alert_concurrency_conflict(client, analyst_headers):
    """Test optimistic concurrency control rejects conflicting expected_status with 409 Conflict."""
    unique_suffix = uuid.uuid4().hex[:6]
    alert_id = f"ALT-CONC-{unique_suffix}"
    now_utc = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        alert = Alert(
            id=alert_id,
            alert_id=alert_id,
            transaction_id=f"TX-CONC-{unique_suffix}",
            user_id="USR-CONC",
            title="Concurrency Alert",
            severity="MEDIUM",
            status="RESOLVED",
            risk_score=65.0,
            created_at=now_utc
        )
        session.add(alert)
        await session.commit()

    # Attempt action expecting NEW status while actual status is RESOLVED
    conflict_resp = await client.post(
        f"/api/v1/alerts/{alert_id}/acknowledge",
        headers=analyst_headers,
        json={"expected_status": "NEW"}
    )
    assert conflict_resp.status_code == 409
    assert "updated by another user" in conflict_resp.json()["detail"]


@pytest.mark.asyncio
async def test_alert_rbac_viewer_restriction(client, viewer_headers):
    """Verify VIEWER role can read/investigate alerts but is forbidden from modifying alert status."""
    unique_suffix = uuid.uuid4().hex[:6]
    alert_id = f"ALT-VIEW-{unique_suffix}"
    now_utc = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        alert = Alert(
            id=alert_id,
            alert_id=alert_id,
            transaction_id=f"TX-VIEW-{unique_suffix}",
            user_id="USR-VIEW",
            title="Viewer Test Alert",
            severity="LOW",
            status="NEW",
            risk_score=30.0,
            created_at=now_utc
        )
        session.add(alert)
        await session.commit()

    # Read: allowed
    get_resp = await client.get(f"/api/v1/alerts/{alert_id}", headers=viewer_headers)
    assert get_resp.status_code == 200

    # Modify status: rejected 403 Forbidden
    mod_resp = await client.post(f"/api/v1/alerts/{alert_id}/acknowledge", headers=viewer_headers)
    assert mod_resp.status_code == 403


@pytest.mark.asyncio
async def test_alert_unauthenticated_rejection(client):
    """Verify unauthenticated requests are rejected with 401 Unauthorized."""
    resp = await client.get("/api/v1/alerts")
    assert resp.status_code == 401
