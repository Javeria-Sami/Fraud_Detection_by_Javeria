"""
Comprehensive Test Suite for Section 05 — Transaction Ingestion Pipeline.
Tests:
- Valid ingestion & normalization
- Request validation (amount, currency, latitude, longitude)
- Entity reference verification (User, Merchant, Device)
- Idempotency & duplicate conflict handling
- Transaction retrieval (GET by ID & 404 handling)
- Transaction listing, pagination bounds, allowlisted sorting, filtering
- RBAC authorization (Admin, Analyst, Viewer, unauthenticated)
- Simulator generation & production safety guards
- Ingestion performance benchmark
"""
import os
import uuid
import time
import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

from backend.app.core.security import create_access_token

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def admin_headers():
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

@pytest.fixture
def viewer_headers():
    token = create_access_token({
        "sub": "USR-VIEWER-01",
        "email": "viewer@fraudshield.io",
        "role": "viewer",
        "username": "viewer"
    })
    return {"Authorization": f"Bearer {token}"}

# ---------------------------------------------------------------------------
# 1. Valid Transaction Ingestion & Normalization
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_valid_transaction_ingestion(client: AsyncClient, analyst_headers: dict):
    txn_id = f"TXN-VALID-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "transaction_id": txn_id,
        "user_id": "USR-CUST-1001",
        "amount": 250.75,
        "currency": "usd",  # lower-case to test normalization
        "country": "gb",    # lower-case to test normalization
        "merchant_name": "  Apple Store Regent St  ",  # whitespace test
        "merchant_category": "Electronics & Devices",
        "payment_method": "credit_card",
        "transaction_type": "purchase",
        "device_id": "DEV-MACBOOK-01",
        "city": "London",
        "latitude": 51.5074,
        "longitude": -0.1278,
        "failed_attempts": 0,
        "source": "API"
    }

    res = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert res.status_code == 200, f"Error: {res.text}"
    data = res.json()
    assert data["id"] == txn_id
    assert data["user_id"] == "USR-CUST-1001"
    assert data["amount"] == 250.75
    assert data["currency"] == "USD"  # Normalized to upper
    assert data["country"] == "GB"    # Normalized to upper
    assert data["merchant_name"] == "Apple Store Regent St"  # Trimmed
    assert data["payment_method"] == "CREDIT_CARD"
    assert data["source"] == "API"
    assert "risk_score" in data
    assert "status" in data

# ---------------------------------------------------------------------------
# 2. Validation Rejections: Negative / Zero Amount
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_invalid_negative_amount_rejected(client: AsyncClient, analyst_headers: dict):
    payload = {
        "user_id": "USR-CUST-1001",
        "amount": -50.0,
        "currency": "USD",
        "merchant_name": "Test Merchant",
        "device_id": "DEV-MACBOOK-01"
    }
    res = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert res.status_code == 422

@pytest.mark.asyncio
async def test_invalid_zero_amount_rejected(client: AsyncClient, analyst_headers: dict):
    payload = {
        "user_id": "USR-CUST-1001",
        "amount": 0.0,
        "currency": "USD",
        "merchant_name": "Test Merchant",
        "device_id": "DEV-MACBOOK-01"
    }
    res = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert res.status_code == 422

# ---------------------------------------------------------------------------
# 3. Validation Rejections: Invalid Currency & Coordinates
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_invalid_currency_rejected(client: AsyncClient, analyst_headers: dict):
    payload = {
        "user_id": "USR-CUST-1001",
        "amount": 100.0,
        "currency": "US",  # Not 3 letters
        "merchant_name": "Test Merchant",
        "device_id": "DEV-MACBOOK-01"
    }
    res = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert res.status_code == 422

@pytest.mark.asyncio
async def test_invalid_latitude_out_of_bounds_rejected(client: AsyncClient, analyst_headers: dict):
    payload = {
        "user_id": "USR-CUST-1001",
        "amount": 100.0,
        "currency": "USD",
        "merchant_name": "Test Merchant",
        "device_id": "DEV-MACBOOK-01",
        "latitude": 95.5  # Max is 90
    }
    res = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert res.status_code == 422

@pytest.mark.asyncio
async def test_invalid_longitude_out_of_bounds_rejected(client: AsyncClient, analyst_headers: dict):
    payload = {
        "user_id": "USR-CUST-1001",
        "amount": 100.0,
        "currency": "USD",
        "merchant_name": "Test Merchant",
        "device_id": "DEV-MACBOOK-01",
        "longitude": -195.0  # Min is -180
    }
    res = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert res.status_code == 422

# ---------------------------------------------------------------------------
# 4. Entity Reference Verification (Unknown / Non-existent User & Merchant)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_unknown_user_rejected(client: AsyncClient, analyst_headers: dict):
    payload = {
        "user_id": "USR-NON-EXISTENT-9999",
        "amount": 100.0,
        "currency": "USD",
        "merchant_name": "Test Merchant",
        "device_id": "DEV-MACBOOK-01"
    }
    res = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert res.status_code == 404
    assert "does not exist" in res.json()["detail"]

@pytest.mark.asyncio
async def test_unknown_merchant_id_rejected(client: AsyncClient, analyst_headers: dict):
    payload = {
        "user_id": "USR-CUST-1001",
        "merchant_id": "MERCH-DOES-NOT-EXIST",
        "merchant_name": "Unknown Entity",
        "amount": 100.0,
        "currency": "USD",
        "device_id": "DEV-MACBOOK-01"
    }
    res = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert res.status_code == 404
    assert "does not exist" in res.json()["detail"]

# ---------------------------------------------------------------------------
# 5. Idempotency & Duplicate Handling
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_idempotent_resubmission(client: AsyncClient, analyst_headers: dict):
    txn_id = f"TXN-IDEMP-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "transaction_id": txn_id,
        "user_id": "USR-CUST-1001",
        "amount": 55.0,
        "currency": "USD",
        "merchant_name": "Starbucks Reserve",
        "device_id": "DEV-MACBOOK-01"
    }

    # First Ingestion
    res1 = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert res1.status_code == 200
    data1 = res1.json()

    # Second Ingestion with exact same payload (Idempotent Replay)
    res2 = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert res2.status_code == 200
    assert res2.headers.get("x-idempotent-replay") == "true"
    data2 = res2.json()
    assert data1["id"] == data2["id"]
    assert data1["amount"] == data2["amount"]

@pytest.mark.asyncio
async def test_duplicate_conflict_with_different_payload(client: AsyncClient, analyst_headers: dict):
    txn_id = f"TXN-CONF-{uuid.uuid4().hex[:6].upper()}"
    payload1 = {
        "transaction_id": txn_id,
        "user_id": "USR-CUST-1001",
        "amount": 100.0,
        "currency": "USD",
        "merchant_name": "Merchant One",
        "device_id": "DEV-MACBOOK-01"
    }
    res1 = await client.post("/api/v1/transactions", json=payload1, headers=analyst_headers)
    assert res1.status_code == 200

    # Submit same transaction_id with different amount
    payload2 = {
        "transaction_id": txn_id,
        "user_id": "USR-CUST-1001",
        "amount": 999.0,  # Conflicting amount
        "currency": "USD",
        "merchant_name": "Merchant One",
        "device_id": "DEV-MACBOOK-01"
    }
    res2 = await client.post("/api/v1/transactions", json=payload2, headers=analyst_headers)
    assert res2.status_code == 409
    assert "already exists with conflicting details" in res2.json()["detail"]

# ---------------------------------------------------------------------------
# 6. Transaction Retrieval (GET by ID) & Missing Handling
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_get_transaction_by_id(client: AsyncClient, analyst_headers: dict):
    txn_id = f"TXN-GET-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "transaction_id": txn_id,
        "user_id": "USR-CUST-1002",
        "amount": 320.0,
        "currency": "USD",
        "merchant_name": "Apple Store Online",
        "device_id": "DEV-WIN-01"
    }
    await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)

    res = await client.get(f"/api/v1/transactions/{txn_id}", headers=analyst_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == txn_id
    assert data["user_id"] == "USR-CUST-1002"
    assert data["amount"] == 320.0

@pytest.mark.asyncio
async def test_get_nonexistent_transaction_returns_404(client: AsyncClient, analyst_headers: dict):
    res = await client.get("/api/v1/transactions/TXN-NONEXISTENT-404", headers=analyst_headers)
    assert res.status_code == 404

# ---------------------------------------------------------------------------
# 7. Transaction Listing, Pagination, Sorting & Filtering
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_transaction_listing_pagination_and_headers(client: AsyncClient, analyst_headers: dict):
    res = await client.get("/api/v1/transactions?page=1&page_size=5", headers=analyst_headers)
    assert res.status_code == 200
    assert "x-total-count" in res.headers
    assert "x-page" in res.headers
    assert "x-total-pages" in res.headers
    data = res.json()
    assert isinstance(data, list)
    assert len(data) <= 5

@pytest.mark.asyncio
async def test_transaction_sorting_allowlist(client: AsyncClient, analyst_headers: dict):
    # Sort by amount asc
    res = await client.get("/api/v1/transactions?sort=amount&order=asc&page_size=10", headers=analyst_headers)
    assert res.status_code == 200
    items = res.json()
    if len(items) >= 2:
        assert items[0]["amount"] <= items[-1]["amount"]

@pytest.mark.asyncio
async def test_transaction_filtering(client: AsyncClient, analyst_headers: dict):
    res = await client.get("/api/v1/transactions?user_id=USR-CUST-1001", headers=analyst_headers)
    assert res.status_code == 200
    items = res.json()
    for item in items:
        assert item["user_id"] == "USR-CUST-1001"

# ---------------------------------------------------------------------------
# 8. RBAC Authorization Enforcement
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_unauthenticated_transaction_ingestion_rejected(client: AsyncClient):
    payload = {
        "user_id": "USR-CUST-1001",
        "amount": 100.0,
        "currency": "USD",
        "merchant_name": "Test Merchant",
        "device_id": "DEV-MACBOOK-01"
    }
    res = await client.post("/api/v1/transactions", json=payload)
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_viewer_cannot_ingest_transaction(client: AsyncClient, viewer_headers: dict):
    payload = {
        "user_id": "USR-CUST-1001",
        "amount": 100.0,
        "currency": "USD",
        "merchant_name": "Test Merchant",
        "device_id": "DEV-MACBOOK-01"
    }
    res = await client.post("/api/v1/transactions", json=payload, headers=viewer_headers)
    assert res.status_code == 403

# ---------------------------------------------------------------------------
# 9. Simulator Safety Guards (Production Check)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_simulator_production_guard(client: AsyncClient, admin_headers: dict, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    res = await client.post("/api/v1/simulator/emit", headers=admin_headers)
    assert res.status_code == 403
    assert "strictly disabled in production" in res.json()["detail"]

# ---------------------------------------------------------------------------
# 10. Performance Ingestion Benchmark (Local Synthetic Workload)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_ingestion_micro_benchmark(client: AsyncClient, analyst_headers: dict):
    workload_count = 25
    success = 0
    start = time.time()

    for i in range(workload_count):
        payload = {
            "transaction_id": f"TXN-BENCH-{i}-{uuid.uuid4().hex[:6].upper()}",
            "user_id": "USR-CUST-1001",
            "amount": 50.0 + (i * 2.5),
            "currency": "USD",
            "merchant_name": "Amazon Web Retail",
            "merchant_category": "Electronics & Retail",
            "payment_method": "CREDIT_CARD",
            "device_id": "DEV-MACBOOK-01",
            "city": "London",
            "country": "GB",
            "source": "SIMULATOR"
        }
        res = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
        if res.status_code == 200:
            success += 1

    elapsed = time.time() - start
    avg_latency = (elapsed / workload_count) * 1000

    assert success == workload_count
    assert avg_latency < 250.0  # Latency under 250ms per transaction locally
    print(f"\n[BENCHMARK] {workload_count} transactions ingested in {elapsed:.2f}s (Avg: {avg_latency:.2f}ms/txn)")
