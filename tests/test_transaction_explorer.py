"""
Backend Transaction Explorer Automated Test Suite.
Section 13 — Transaction Explorer.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from backend.app.main import app
from backend.app.core.security import create_access_token

@pytest.mark.asyncio
async def test_transaction_explorer_listing_and_filtering():
    token = create_access_token(
        data={"sub": "USR-ANALYST-01", "role": "analyst", "email": "analyst@fraudshield.io"}
    )
    headers = {"Authorization": f"Bearer {token}"}
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Basic listing with pagination headers
        res = await client.get("/api/v1/transactions?page=1&page_size=10", headers=headers)
        assert res.status_code == 200
        assert "x-total-count" in res.headers
        assert "x-page" in res.headers
        assert "x-total-pages" in res.headers
        items = res.json()
        assert isinstance(items, list)
        assert len(items) <= 10

        # 2. Risk level filter
        res_high = await client.get("/api/v1/transactions?risk_level=HIGH", headers=headers)
        assert res_high.status_code == 200
        for tx in res_high.json():
            assert tx["risk_level"] == "HIGH"

        # 3. Min/Max risk score filter
        res_scores = await client.get("/api/v1/transactions?min_risk_score=70&max_risk_score=100", headers=headers)
        assert res_scores.status_code == 200
        for tx in res_scores.json():
            assert tx["risk_score"] >= 70

        # 4. Valid Date range filter
        now = datetime.now(timezone.utc)
        start_str = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        end_str = now.strftime("%Y-%m-%d")
        res_dates = await client.get(f"/api/v1/transactions?start_date={start_str}&end_date={end_str}", headers=headers)
        assert res_dates.status_code == 200

        # 5. Invalid date range (start > end)
        res_inv_dates = await client.get(f"/api/v1/transactions?start_date={end_str}&end_date={start_str}", headers=headers)
        assert res_inv_dates.status_code == 400

        # 6. Exceeded max 90-day range
        old_start = (now - timedelta(days=120)).strftime("%Y-%m-%d")
        res_exceeded = await client.get(f"/api/v1/transactions?start_date={old_start}&end_date={end_str}", headers=headers)
        assert res_exceeded.status_code == 400

@pytest.mark.asyncio
async def test_transaction_investigation_detail_endpoint():
    token = create_access_token(
        data={"sub": "USR-ANALYST-01", "role": "analyst", "email": "analyst@fraudshield.io"}
    )
    headers = {"Authorization": f"Bearer {token}"}
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First get any transaction ID
        list_res = await client.get("/api/v1/transactions?limit=1", headers=headers)
        assert list_res.status_code == 200
        txns = list_res.json()
        if not txns:
            pytest.skip("No seeded transactions found")
        
        target_id = txns[0]["id"]
        
        # Test investigate endpoint
        inv_res = await client.get(f"/api/v1/transactions/{target_id}/investigate", headers=headers)
        assert inv_res.status_code == 200
        data = inv_res.json()
        assert "transaction" in data
        assert data["transaction"]["id"] == target_id
        assert "risk" in data
        assert "rules" in data
        assert "ml_prediction" in data
        assert "features" in data
        assert "alerts" in data

@pytest.mark.asyncio
async def test_transaction_explorer_unauthorized_rejection():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/transactions")
        assert res.status_code == 401
