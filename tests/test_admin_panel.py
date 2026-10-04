"""
Unit and Integration Tests for Section 22: Admin Panel.
Tests Admin Overview, Platform Health Diagnostics, User Management,
Last Admin & Self-Lockout Protections, Roles & Permission Matrix,
Typed System Settings, and RBAC security boundaries.
"""
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.models.user import User, Role, Permission


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


@pytest.mark.asyncio
async def test_admin_overview(admin_token: str):
    """Verifies that the /admin/overview endpoint returns real consolidated platform, user, and detection telemetry."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/admin/overview",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()

        # Platform status
        assert "platform" in data
        assert data["platform"]["overall_status"] in ["HEALTHY", "DEGRADED"]
        assert data["platform"]["database_status"] == "HEALTHY"

        # User stats
        assert "users" in data
        assert data["users"]["total_users"] >= 3
        assert data["users"]["admin_count"] >= 1

        # Detection stats
        assert "detection" in data
        assert data["detection"]["total_fraud_rules"] >= 5

        # ML stats
        assert "ml" in data
        assert "deployed_model_version" in data["ml"]

        # System info
        assert "system" in data
        assert data["system"]["application_name"] is not None


@pytest.mark.asyncio
async def test_admin_platform_diagnostics(admin_token: str):
    """Verifies that the /admin/platform/status endpoint performs real component health checks."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/admin/platform/status",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "components" in data
        assert len(data["components"]) >= 5

        component_names = [c["name"] for c in data["components"]]
        assert "PostgreSQL Database" in component_names
        assert "Fraud Rule Engine" in component_names
        assert "Real-Time WebSocket Bus" in component_names


@pytest.mark.asyncio
async def test_admin_users_pagination_search_filter(admin_token: str):
    """Verifies user listing with pagination, search query, role filter, and status filter."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Base list
        res = await client.get(
            "/api/v1/admin/users?page=1&page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 3
        assert len(data["users"]) <= 10

        # 2. Search by query
        res_search = await client.get(
            "/api/v1/admin/users?query=admin",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_search.status_code == 200
        assert any("admin" in u["email"] for u in res_search.json()["users"])

        # 3. Filter by role
        res_role = await client.get(
            "/api/v1/admin/users?role=ADMIN",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_role.status_code == 200
        for u in res_role.json()["users"]:
            assert u["role"].upper() == "ADMIN"

        # 4. Filter by status
        res_status = await client.get(
            "/api/v1/admin/users?is_active=true",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_status.status_code == 200
        for u in res_status.json()["users"]:
            assert u["is_active"] is True


@pytest.mark.asyncio
async def test_admin_user_detail_and_create(admin_token: str):
    """Verifies admin user detail inspection and new user creation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Inspect existing admin user
        res_detail = await client.get(
            "/api/v1/admin/users/admin@fraudshield.io",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_detail.status_code == 200
        detail = res_detail.json()
        assert detail["email"] == "admin@fraudshield.io"
        assert detail["role"] == "ADMIN"
        assert len(detail["effective_permissions"]) > 0

        # Create new user
        uid_rand = uuid.uuid4().hex[:6]
        new_email = f"test.admin.user.{uid_rand}@example.com"
        create_payload = {
            "email": new_email,
            "username": f"testadmin_{uid_rand}",
            "full_name": "Test Admin Created User",
            "password": "SecurePassword123!",
            "role": "ANALYST",
            "is_active": True,
        }
        res_create = await client.post(
            "/api/v1/admin/users",
            json=create_payload,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_create.status_code == 201
        created = res_create.json()
        assert created["email"] == new_email
        assert created["role"] == "ANALYST"


@pytest.mark.asyncio
async def test_last_admin_protection_and_self_lockout(admin_token: str):
    """
    Critical Safety Test:
    Ensures an administrator CANNOT deactivate or demote the last active admin account.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Fetch current admin user
        res_admin = await client.get(
            "/api/v1/admin/users?role=ADMIN&is_active=true",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        active_admins = res_admin.json()["users"]
        assert len(active_admins) >= 1
        sole_admin_id = active_admins[0]["id"]

        # If only 1 admin exists, trying to deactivate must return 400 Bad Request
        if len(active_admins) == 1:
            res_deact = await client.patch(
                f"/api/v1/admin/users/{sole_admin_id}/status",
                json={"is_active": False, "reason": "Attempting unauthorized deactivation of sole admin"},
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res_deact.status_code == 400
            assert "last active administrator" in res_deact.json()["detail"].lower()

            # Trying to demote the sole admin to VIEWER must also return 400 Bad Request
            res_demote = await client.patch(
                f"/api/v1/admin/users/{sole_admin_id}/role",
                json={"role": "VIEWER", "reason": "Attempting demotion of sole admin"},
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res_demote.status_code == 400
            assert "last active administrator" in res_demote.json()["detail"].lower()


@pytest.mark.asyncio
async def test_roles_and_permission_matrix(admin_token: str):
    """Verifies that roles, permissions catalog, and the permission matrix endpoint return accurate RBAC mappings."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Roles list
        res_roles = await client.get(
            "/api/v1/admin/roles",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_roles.status_code == 200
        roles = res_roles.json()
        assert len(roles) >= 3
        role_names = [r["name"] for r in roles]
        assert "ADMIN" in role_names
        assert "ANALYST" in role_names
        assert "VIEWER" in role_names

        # 2. Permissions catalog
        res_perms = await client.get(
            "/api/v1/admin/permissions",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_perms.status_code == 200
        perms = res_perms.json()
        assert len(perms) >= 10
        perm_names = [p["name"] for p in perms]
        assert "transaction.read" in perm_names
        assert "rule.manage" in perm_names

        # 3. Permission matrix
        res_matrix = await client.get(
            "/api/v1/admin/permission-matrix",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_matrix.status_code == 200
        matrix_data = res_matrix.json()
        assert "roles" in matrix_data
        assert "matrix" in matrix_data
        assert len(matrix_data["matrix"]) >= 10

        # Check that ADMIN has rule.manage True and VIEWER has rule.manage False
        rule_manage_row = next(
            (entry for entry in matrix_data["matrix"] if entry["permission_name"] == "rule.manage"),
            None,
        )
        assert rule_manage_row is not None
        assert rule_manage_row["granted_roles"].get("ADMIN") is True
        assert rule_manage_row["granted_roles"].get("VIEWER") is False


@pytest.mark.asyncio
async def test_system_settings_typed_validation_and_masking(admin_token: str):
    """Verifies typed system settings retrieval, secret masking, and strict schema validation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List settings
        res_settings = await client.get(
            "/api/v1/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_settings.status_code == 200
        settings_data = res_settings.json()
        assert len(settings_data["settings"]) >= 5

        # Check secret masking for sensitive setting
        secret_setting = next(
            (s for s in settings_data["settings"] if s["key"] == "webhook_signing_secret"),
            None,
        )
        if secret_setting:
            assert secret_setting["is_sensitive"] is True
            assert secret_setting["value"] == "••••••••••••"

        # 2. Valid setting update
        res_update = await client.put(
            "/api/v1/admin/settings/risk_threshold_high",
            json={"value": 88, "reason": "Operational threshold tuning"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_update.status_code == 200
        assert res_update.json()["value"] == 88

        # 3. Invalid setting update (out of bounds)
        res_invalid = await client.put(
            "/api/v1/admin/settings/risk_threshold_high",
            json={"value": 150, "reason": "Invalid out of range value"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_invalid.status_code == 422
        assert "must be <=" in res_invalid.json()["detail"].lower()


@pytest.mark.asyncio
async def test_admin_rbac_enforcement(analyst_token: str, viewer_token: str):
    """
    Security Test:
    Ensures that non-admin roles (analyst, viewer) are strictly rejected with HTTP 403.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for token in [analyst_token, viewer_token]:
            # Overview
            res1 = await client.get("/api/v1/admin/overview", headers={"Authorization": f"Bearer {token}"})
            assert res1.status_code == 403

            # Platform status
            res2 = await client.get("/api/v1/admin/platform/status", headers={"Authorization": f"Bearer {token}"})
            assert res2.status_code == 403

            # Users
            res3 = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
            assert res3.status_code == 403

            # Settings
            res4 = await client.get("/api/v1/admin/settings", headers={"Authorization": f"Bearer {token}"})
            assert res4.status_code == 403
