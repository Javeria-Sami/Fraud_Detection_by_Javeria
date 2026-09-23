"""
Backend Dashboard API Automated Test Suite.
Section 12 — Main Security Dashboard.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone
from backend.app.main import app
from backend.app.core.security import create_access_token

@pytest.mark.asyncio
async def test_dashboard_api_authenticated():
    token = create_access_token(
        data={"sub": "admin_user_001", "role": "ADMIN", "permissions": ["*"]}
    )
    headers = {"Authorization": f"Bearer {token}"}
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Default 24h dashboard
        res = await client.get("/api/v1/analytics/dashboard", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["time_range"] == "24h"
        assert "kpis" in data
        assert "total_transactions" in data["kpis"]
        assert "anomaly_rate" in data["kpis"]
        assert "risk_distribution" in data
        assert "LOW" in data["risk_distribution"]
        assert "CRITICAL" in data["risk_distribution"]
        assert "trends" in data
        assert len(data["trends"]) == 24
        assert "recent_transactions" in data
        assert "active_alerts" in data
        assert "system_status" in data
        assert len(data["system_status"]) >= 6

        # 2. 15m dashboard
        res_15m = await client.get("/api/v1/analytics/dashboard?time_range=15m", headers=headers)
        assert res_15m.status_code == 200
        data_15m = res_15m.json()
        assert data_15m["time_range"] == "15m"
        assert len(data_15m["trends"]) == 15

        # 3. 1h dashboard
        res_1h = await client.get("/api/v1/analytics/dashboard?time_range=1h", headers=headers)
        assert res_1h.status_code == 200
        assert len(res_1h.json()["trends"]) == 12

        # 4. 6h dashboard
        res_6h = await client.get("/api/v1/analytics/dashboard?time_range=6h", headers=headers)
        assert res_6h.status_code == 200
        assert len(res_6h.json()["trends"]) == 12

        # 5. 7d dashboard
        res_7d = await client.get("/api/v1/analytics/dashboard?time_range=7d", headers=headers)
        assert res_7d.status_code == 200
        assert len(res_7d.json()["trends"]) == 7

@pytest.mark.asyncio
async def test_dashboard_api_unauthenticated_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/analytics/dashboard")
        assert res.status_code == 401
