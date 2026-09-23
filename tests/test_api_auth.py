"""
Integration Tests for Authentication, Transactions Ingestion, and Cases API.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

@pytest.mark.asyncio
async def test_auth_login_and_me():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Admin login
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@fraudshield.io",
            "password": "Admin@123456"
        })
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        assert token_data["role"] == "admin"
        
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test /auth/me
        me_res = await ac.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email"] == "admin@fraudshield.io"
        assert me_data["role"] == "admin"

@pytest.mark.asyncio
async def test_transaction_ingestion_and_alert():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login analyst
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # Ingest a severe anomaly transaction
        txn_payload = {
            "user_id": "USR-CUST-1001",
            "amount": 9500.0,
            "currency": "USD",
            "merchant_name": "Binance Global",
            "merchant_category": "crypto_exchange",
            "payment_method": "credit_card",
            "device_id": "DEV-TEST-UNKNOWN-99",
            "city": "Unknown City",
            "failed_attempts": 4
        }
        
        ingest_res = await ac.post("/api/v1/transactions", json=txn_payload, headers=headers)
        assert ingest_res.status_code == 200, f"Error: {ingest_res.status_code} {ingest_res.text}"
        txn_data = ingest_res.json()
        assert txn_data["risk_score"] > 60.0
        assert txn_data["risk_level"] in ["MEDIUM", "HIGH", "CRITICAL"]
        assert len(txn_data["rules_triggered"]) > 0

        # Query list
        list_res = await ac.get("/api/v1/transactions", headers=headers)
        assert list_res.status_code == 200
        assert len(list_res.json()) > 0
