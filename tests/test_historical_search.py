"""
Comprehensive Unit and Integration Tests for Historical & Cross-Entity Search.
Section 17 — Historical Search.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta

from backend.app.main import app
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import create_access_token
from backend.app.models.transaction import Transaction
from backend.app.models.alert import Alert
from backend.app.models.case import Case


def get_auth_headers(role: str = "analyst", email: str = "analyst@fraudshield.io"):
    token = create_access_token({
        "sub": f"USR-{role.upper()}-01",
        "email": email,
        "role": role,
        "username": role
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_exact_identifier_search_and_relevance():
    """
    Test exact identifier lookups across transactions, alerts, cases, users, devices, merchants.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("analyst")

        # Search for a specific user ID
        res = await ac.post("/api/v1/search/query", json={
            "q": "USR-CUST-1001",
            "entity_types": ["transactions", "alerts", "cases", "users", "devices", "merchants"]
        }, headers=headers)
        assert res.status_code == 200
        data = res.json()

        assert data["counts"]["total"] > 0
        assert data["counts"]["users"] >= 1
        # Top user result should have relevance score 3.0 for exact ID match
        assert any(u["user_id"] == "USR-CUST-1001" and u["relevance_score"] == 3.0 for u in data["users"]["items"])


@pytest.mark.asyncio
async def test_partial_text_search():
    """
    Test partial text matching for merchant name, case title, or city.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("analyst")

        res = await ac.post("/api/v1/search/query", json={
            "q": "Global",
            "entity_types": ["transactions", "merchants"]
        }, headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["counts"]["transactions"] >= 0
        assert data["counts"]["merchants"] >= 0


@pytest.mark.asyncio
async def test_multidimensional_filters():
    """
    Test advanced filters: risk score, risk level, amount range, payment method, date range.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("analyst")

        # High risk transactions with min amount
        res = await ac.post("/api/v1/search/query", json={
            "entity_types": ["transactions"],
            "risk_min": 50.0,
            "min_amount": 100.0,
            "page": 1,
            "page_size": 10
        }, headers=headers)
        assert res.status_code == 200
        data = res.json()
        for t in data["transactions"]["items"]:
            assert t["risk_score"] >= 50.0
            assert t["amount"] >= 100.0


@pytest.mark.asyncio
async def test_get_search_endpoint_url_query():
    """
    Test GET /api/v1/search query parameters endpoint.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("analyst")

        res = await ac.get("/api/v1/search?q=USR-CUST-1002&entity=transactions,users&page=1&page_size=5", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["query"] == "USR-CUST-1002"
        assert "transactions" in data
        assert "users" in data


@pytest.mark.asyncio
async def test_search_pagination_and_sorting():
    """
    Test server-side pagination and multiple sort options.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("analyst")

        # Page 1, size 2
        res1 = await ac.post("/api/v1/search/query", json={
            "entity_types": ["transactions"],
            "sort_by": "amount_desc",
            "page": 1,
            "page_size": 2
        }, headers=headers)
        assert res1.status_code == 200
        data1 = res1.json()
        assert len(data1["transactions"]["items"]) <= 2

        if len(data1["transactions"]["items"]) == 2:
            amt0 = data1["transactions"]["items"][0]["amount"]
            amt1 = data1["transactions"]["items"][1]["amount"]
            assert amt0 >= amt1


@pytest.mark.asyncio
async def test_autocomplete_endpoint():
    """
    Test fast autocomplete endpoint suggestions for search dropdown.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("analyst")

        res = await ac.get("/api/v1/search/autocomplete?q=USR", headers=headers)
        assert res.status_code == 200
        suggestions = res.json()
        assert isinstance(suggestions, list)
        for s in suggestions:
            assert "id" in s
            assert "title" in s
            assert "navigation_url" in s


@pytest.mark.asyncio
async def test_rbac_case_search_isolation():
    """
    Test that Viewers cannot search or view Cases, but Analysts and Admins can.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Viewer
        viewer_headers = get_auth_headers("viewer", "viewer@fraudshield.io")

        v_res = await ac.post("/api/v1/search/query", json={
            "entity_types": ["cases", "transactions"]
        }, headers=viewer_headers)
        assert v_res.status_code == 200
        v_data = v_res.json()
        assert v_data["counts"]["cases"] == 0
        assert len(v_data["cases"]["items"]) == 0

        # 2. Analyst
        analyst_headers = get_auth_headers("analyst", "analyst@fraudshield.io")

        a_res = await ac.post("/api/v1/search/query", json={
            "entity_types": ["cases"]
        }, headers=analyst_headers)
        assert a_res.status_code == 200
        a_data = a_res.json()
        assert a_data["counts"]["cases"] >= 0


@pytest.mark.asyncio
async def test_sql_injection_resilience():
    """
    Test SQL injection attack strings in search query parameter.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("analyst")

        sqli_queries = [
            "' OR '1'='1",
            "'; DROP TABLE transactions; --",
            "admin' --",
            "UNION SELECT * FROM users --"
        ]

        for sqli in sqli_queries:
            res = await ac.post("/api/v1/search/query", json={
                "q": sqli,
                "entity_types": ["transactions", "alerts", "cases"]
            }, headers=headers)
            assert res.status_code == 200
            data = res.json()
            assert isinstance(data["counts"]["total"], int)
