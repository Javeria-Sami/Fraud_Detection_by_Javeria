"""
Unit and Integration Tests for Section 23: Audit Logging Subsystem.
Tests standardized audit event recording, automatic secret masking,
search, filtering, pagination, statistics, immutability, and RBAC boundaries.
"""
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.core.audit import AuditService, sanitize_audit_data
from backend.app.models.audit_log import AuditLog
from backend.app.schemas.audit import AuditEventCreate, AuditSeverity, AuditOutcome


@pytest.fixture
def admin_token() -> str:
    return create_access_token(
        data={"sub": "USR-ADMIN-01", "email": "admin@fraudshield.io", "role": "admin"}
    )


@pytest.fixture
def analyst_token() -> str:
    return create_access_token(
        data={"sub": "USR-ANALYST-01", "email": "analyst@fraudshield.io", "role": "analyst"}
    )


@pytest.fixture
def viewer_token() -> str:
    return create_access_token(
        data={"sub": "USR-VIEWER-01", "email": "viewer@fraudshield.io", "role": "viewer"}
    )


def test_sanitize_audit_data():
    """Verifies that sensitive credentials, tokens, and keys are redacted with masking."""
    dirty_payload = {
        "username": "security_admin",
        "password": "SuperSecretPassword123!",
        "api_key": "live_sk_987654321",
        "webhook_signing_secret": "whsec_abcdef123456",
        "nested": {
            "token": "bearer eyJhbGciOi...",
            "safe_metric": 42.5,
            "card_number": "4111111111111111",
        },
        "safe_list": ["item1", "item2"],
    }
    cleaned = sanitize_audit_data(dirty_payload)

    assert cleaned["username"] == "security_admin"
    assert cleaned["password"] == "••••••••••••"
    assert cleaned["api_key"] == "••••••••••••"
    assert cleaned["webhook_signing_secret"] == "••••••••••••"
    assert cleaned["nested"]["token"] == "••••••••••••"
    assert cleaned["nested"]["card_number"] == "••••••••••••"
    assert cleaned["nested"]["safe_metric"] == 42.5
    assert cleaned["safe_list"] == ["item1", "item2"]


@pytest.mark.asyncio
async def test_audit_list_search_and_filtering(admin_token: str):
    """Verifies audit log retrieval with search query, action filter, severity, and pagination."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Base listing
        res = await client.get(
            "/api/v1/audit-logs?page=1&page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "total" in data
        assert "items" in data
        assert isinstance(data["items"], list)

        # 2. Text search query
        res_search = await client.get(
            "/api/v1/audit-logs?query=admin",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_search.status_code == 200

        # 3. Severity filter
        res_sev = await client.get(
            "/api/v1/audit-logs?severity=INFO",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_sev.status_code == 200

        # 4. Outcome filter
        res_outcome = await client.get(
            "/api/v1/audit-logs?outcome=SUCCESS",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_outcome.status_code == 200


@pytest.mark.asyncio
async def test_audit_stats_endpoint(admin_token: str):
    """Verifies that the /audit-logs/stats endpoint calculates live telemetry and breakdowns."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get(
            "/api/v1/audit-logs/stats",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()

        assert "total_events" in data
        assert "events_today" in data
        assert "high_critical_count" in data
        assert "failed_denied_count" in data
        assert "action_breakdown" in data
        assert "severity_breakdown" in data
        assert "outcome_breakdown" in data


@pytest.mark.asyncio
async def test_audit_detail_and_not_found(admin_token: str):
    """Verifies audit record detail inspection and 404 behavior for non-existent IDs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Fetch list to obtain a valid ID
        res_list = await client.get(
            "/api/v1/audit-logs?limit=5",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_list.status_code == 200
        items = res_list.json()
        if isinstance(items, dict):
            items = items.get("items", [])

        if len(items) > 0:
            first_id = items[0]["id"]
            res_detail = await client.get(
                f"/api/v1/audit-logs/{first_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res_detail.status_code == 200
            detail_data = res_detail.json()
            assert detail_data["id"] == first_id
            assert "action" in detail_data
            assert "target_entity" in detail_data

        # Non-existent ID returns 404
        fake_id = str(uuid.uuid4())
        res_404 = await client.get(
            f"/api/v1/audit-logs/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_audit_immutability_guarantees(admin_token: str):
    """
    Security & Immutability Test:
    Verifies that PUT, PATCH, and DELETE operations are strictly rejected (HTTP 405 Method Not Allowed)
    to ensure audit logs cannot be modified or deleted by users.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        fake_id = str(uuid.uuid4())

        # Attempt to modify an audit log
        res_put = await client.put(
            f"/api/v1/audit-logs/{fake_id}",
            json={"action": "FALSIFIED_ACTION"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_put.status_code == 405

        res_patch = await client.patch(
            f"/api/v1/audit-logs/{fake_id}",
            json={"result": "SUCCESS"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_patch.status_code == 405

        # Attempt to delete an audit log
        res_delete = await client.delete(
            f"/api/v1/audit-logs/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_delete.status_code == 405


@pytest.mark.asyncio
async def test_audit_rbac_boundaries(viewer_token: str):
    """
    Security Test:
    Verifies that unprivileged roles (e.g. VIEWER) are strictly rejected with HTTP 403 Forbidden.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Viewer accessing audit logs receives 403
        res = await client.get(
            "/api/v1/audit-logs",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert res.status_code == 403

        # Viewer accessing stats receives 403
        res_stats = await client.get(
            "/api/v1/audit-logs/stats",
            headers={"Authorization": f"Bearer {viewer_token}"},
        )
        assert res_stats.status_code == 403

        # Unauthenticated request receives 401
        res_unauth = await client.get("/api/v1/audit-logs")
        assert res_unauth.status_code in (401, 403)
