"""
Automated Integration Tests for Section 18 — Analytics & Visualization.
Validates read-only aggregation queries, multi-currency accounting, risk distributions, MTTR calculations, and RBAC isolation.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from backend.app.main import app
from backend.app.models.transaction import Transaction
from backend.app.models.alert import Alert
from backend.app.models.case import Case
from backend.app.models.rule import FraudRule


@pytest.mark.asyncio
async def test_analytics_overview_endpoint():
    """
    Test GET /api/v1/analytics/overview returns accurate aggregate KPIs.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        res = await ac.get("/api/v1/analytics/overview?range=30d", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "kpis" in data
        assert "total_transactions" in data["kpis"]
        assert "currencies" in data["kpis"]
        assert "anomaly_rate" in data["kpis"]
        assert "active_alerts" in data["kpis"]
        assert "open_cases" in data["kpis"]
        assert isinstance(data["kpis"]["currencies"], list)


@pytest.mark.asyncio
async def test_transaction_analytics_volume_and_distributions():
    """
    Test GET /api/v1/analytics/transactions returns time-series volume and categories.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        res = await ac.get("/api/v1/analytics/transactions?range=7d", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "volume_trend" in data
        assert "status_distribution" in data
        assert "category_distribution" in data
        assert "payment_method_distribution" in data
        assert isinstance(data["volume_trend"], list)


@pytest.mark.asyncio
async def test_risk_analytics_histogram_and_trends():
    """
    Test GET /api/v1/analytics/risk returns 0-100 histogram buckets and tier breakdowns.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        res = await ac.get("/api/v1/analytics/risk?range=30d", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "risk_level_distribution" in data
        assert "risk_histogram" in data
        assert "risk_trend" in data
        assert len(data["risk_histogram"]) == 5
        assert data["risk_histogram"][0]["bucket"] == "0–20 (Minimal)"


@pytest.mark.asyncio
async def test_alert_analytics_and_resolution_mttr():
    """
    Test GET /api/v1/analytics/alerts returns severity distribution and MTTR resolution metrics.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        res = await ac.get("/api/v1/analytics/alerts?range=30d", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "alert_trend" in data
        assert "severity_distribution" in data
        assert "response_metrics" in data
        assert "total_resolved" in data["response_metrics"]


@pytest.mark.asyncio
async def test_ml_anomaly_analytics_histogram():
    """
    Test GET /api/v1/analytics/ml returns isolation forest score buckets and anomaly rates.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        res = await ac.get("/api/v1/analytics/ml?range=30d", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "score_histogram" in data
        assert "model_versions" in data
        assert len(data["score_histogram"]) == 5


@pytest.mark.asyncio
async def test_rule_analytics_and_trigger_rates():
    """
    Test GET /api/v1/analytics/rules returns rule execution totals and top triggered rules.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        res = await ac.get("/api/v1/analytics/rules", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_rules" in data
        assert "top_triggered_rules" in data
        assert isinstance(data["top_triggered_rules"], list)


@pytest.mark.asyncio
async def test_case_analytics_and_rbac_isolation():
    """
    Test GET /api/v1/analytics/cases enforces RBAC:
    - Viewers receive 0 cases and null analyst workload.
    - Analysts and Admins receive full case lifecycle metrics.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Viewer role
        v_login = await ac.post("/api/v1/auth/login", json={
            "email": "viewer@fraudshield.io",
            "password": "Viewer@123456"
        })
        v_headers = {"Authorization": f"Bearer {v_login.json()['access_token']}"}
        v_res = await ac.get("/api/v1/analytics/cases?range=30d", headers=v_headers)
        assert v_res.status_code == 200
        v_data = v_res.json()
        assert v_data["total_cases"] == 0
        assert v_data["analyst_workload"] is None

        # 2. Analyst role
        a_login = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        a_headers = {"Authorization": f"Bearer {a_login.json()['access_token']}"}
        a_res = await ac.get("/api/v1/analytics/cases?range=30d", headers=a_headers)
        assert a_res.status_code == 200
        a_data = a_res.json()
        assert a_data["total_cases"] >= 0
        assert a_data["analyst_workload"] is not None


@pytest.mark.asyncio
async def test_geographic_and_entity_patterns():
    """
    Test GET /api/v1/analytics/geographic and /api/v1/analytics/entities endpoints.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        geo_res = await ac.get("/api/v1/analytics/geographic?range=30d", headers=headers)
        assert geo_res.status_code == 200
        geo_data = geo_res.json()
        assert "countries" in geo_data
        assert "cities" in geo_data

        ent_res = await ac.get("/api/v1/analytics/entities?range=30d", headers=headers)
        assert ent_res.status_code == 200
        ent_data = ent_res.json()
        assert "top_merchants" in ent_data
        assert "top_devices" in ent_data


@pytest.mark.asyncio
async def test_date_range_presets_and_custom_bounds():
    """
    Test range presets (today, yesterday, 7d, 30d, 90d, this_month, previous_month, custom).
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        for r_preset in ["today", "yesterday", "7d", "30d", "90d", "this_month", "previous_month"]:
            res = await ac.get(f"/api/v1/analytics/overview?range={r_preset}", headers=headers)
            assert res.status_code == 200
            assert res.json()["date_from"] <= res.json()["date_to"]

        # Custom ISO dates
        dt_start = (datetime.now(timezone.utc) - timedelta(days=15)).isoformat()
        dt_end = datetime.now(timezone.utc).isoformat()
        res_custom = await ac.get(f"/api/v1/analytics/overview?range=custom&date_from={dt_start}&date_to={dt_end}", headers=headers)
        assert res_custom.status_code == 200
        assert "Custom" in res_custom.json()["time_range"]
