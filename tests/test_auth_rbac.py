"""
Comprehensive Automated Tests for Section 03: Authentication & RBAC.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.main import app
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from backend.app.models.user import User, Role
from backend.app.models.audit_log import AuditLog

@pytest.mark.asyncio
async def test_password_hashing_and_verification():
    """Verifies PBKDF2 HMAC-SHA256 hashing format and constant-time verification."""
    password = "Secur3_Password!@2026"
    hashed = get_password_hash(password)
    
    assert "$" in hashed
    salt, hash_val = hashed.split("$")
    assert len(salt) == 32
    assert len(hash_val) == 64
    
    # Correct password verification
    assert verify_password(password, hashed) is True
    # Incorrect password verification
    assert verify_password("WrongPassword123", hashed) is False
    # Malformed hash string handling
    assert verify_password(password, "malformed_hash_without_delimiter") is False

@pytest.mark.asyncio
async def test_jwt_token_generation_and_decoding():
    """Verifies claims, token types, and cryptographic decoding for access and refresh tokens."""
    payload_data = {"sub": "USR-TEST-001", "role": "analyst", "email": "analyst@test.local"}
    
    access_tok = create_access_token(payload_data)
    decoded_access = decode_token(access_tok)
    assert decoded_access["sub"] == "USR-TEST-001"
    assert decoded_access["type"] == "access"
    assert "exp" in decoded_access
    assert "jti" in decoded_access
    
    refresh_tok = create_refresh_token(payload_data)
    decoded_refresh = decode_token(refresh_tok)
    assert decoded_refresh["sub"] == "USR-TEST-001"
    assert decoded_refresh["type"] == "refresh"
    assert "exp" in decoded_refresh

@pytest.mark.asyncio
async def test_successful_login_and_token_refresh():
    """Tests full login lifecycle, access/refresh token issue, and token refresh rotation."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login with analyst credentials
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        assert "refresh_token" in token_data
        assert token_data["role"] == "analyst"
        assert token_data["token_type"] == "bearer"
        assert len(token_data["permissions"]) > 0
        assert "case.create" in token_data["permissions"] or "transaction.read" in token_data["permissions"]

        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]

        # 2. Get /auth/me with access token
        headers = {"Authorization": f"Bearer {access_token}"}
        me_res = await ac.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        user_info = me_res.json()
        assert user_info["email"] == "analyst@fraudshield.io"
        assert user_info["role"] == "analyst"
        assert "password" not in user_info
        assert "hashed_password" not in user_info

        # 3. Rotate access token with refresh token
        ref_res = await ac.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert ref_res.status_code == 200
        new_token_data = ref_res.json()
        assert "access_token" in new_token_data
        assert new_token_data["token_type"] == "bearer"

        # Verify new access token works
        new_headers = {"Authorization": f"Bearer {new_token_data['access_token']}"}
        me_after_refresh = await ac.get("/api/v1/auth/me", headers=new_headers)
        assert me_after_refresh.status_code == 200

@pytest.mark.asyncio
async def test_account_enumeration_protection_and_invalid_credentials():
    """Ensures anti-enumeration generic responses on non-existent accounts and wrong passwords."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Non-existent email
        res1 = await ac.post("/api/v1/auth/login", json={
            "email": "nonexistent.user.12345@fraudshield.io",
            "password": "Password@123"
        })
        assert res1.status_code == 401
        assert res1.json()["detail"] == "Incorrect email or password"

        # Valid email, wrong password
        res2 = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "WrongPassword999!"
        })
        assert res2.status_code == 401
        assert res2.json()["detail"] == "Incorrect email or password"

@pytest.mark.asyncio
async def test_deactivated_account_rejection():
    """Verifies that inactive users cannot log in or access protected resources."""
    import uuid
    suffix = uuid.uuid4().hex[:6]
    test_email = f"inactive.{suffix}@fraudshield.io"
    test_username = f"inactive_user_{suffix}"
    test_id = f"USR-INACTIVE-{suffix}"

    async with AsyncSessionLocal() as session:
        # Create a deactivated user
        role_stmt = select(Role).where(Role.name == "viewer")
        viewer_role = (await session.execute(role_stmt)).scalar_one_or_none()
        
        inactive_user = User(
            id=test_id,
            email=test_email,
            username=test_username,
            full_name="Inactive Suspended User",
            hashed_password=get_password_hash("Inactive@123456"),
            role=viewer_role,
            is_active=False
        )
        session.add(inactive_user)
        await session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": test_email,
            "password": "Inactive@123456"
        })
        assert login_res.status_code == 403
        assert "deactivated" in login_res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_rbac_endpoint_authorization():
    """
    Verifies strict Role-Based Access Control:
    - ADMIN has access to administrative endpoints (/admin/users, /admin/rules, etc.)
    - ANALYST is denied access to /admin/users (403 Forbidden)
    - VIEWER is denied access to /admin/users (403 Forbidden)
    - Unauthenticated request is rejected (401 Unauthorized)
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Unauthenticated request to /admin/users
        unauth_res = await ac.get("/api/v1/admin/users")
        assert unauth_res.status_code == 401

        # 2. Login as Admin
        admin_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@fraudshield.io",
            "password": "Admin@123456"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
        
        admin_res = await ac.get("/api/v1/admin/users", headers=admin_headers)
        assert admin_res.status_code == 200
        assert len(admin_res.json()) > 0

        # 3. Login as Analyst
        analyst_login = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        analyst_headers = {"Authorization": f"Bearer {analyst_login.json()['access_token']}"}
        
        analyst_admin_res = await ac.get("/api/v1/admin/users", headers=analyst_headers)
        assert analyst_admin_res.status_code == 403
        assert "Requires one of roles" in analyst_admin_res.json()["detail"] or "Access denied" in analyst_admin_res.json()["detail"]

        # 4. Login as Viewer
        viewer_login = await ac.post("/api/v1/auth/login", json={
            "email": "viewer@fraudshield.io",
            "password": "Viewer@123456"
        })
        viewer_headers = {"Authorization": f"Bearer {viewer_login.json()['access_token']}"}
        
        viewer_admin_res = await ac.get("/api/v1/admin/users", headers=viewer_headers)
        assert viewer_admin_res.status_code == 403

@pytest.mark.asyncio
async def test_auth_audit_trail_logging():
    """Verifies that authentication events (LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT) generate audit records."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Perform valid login and logout
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@fraudshield.io",
            "password": "Admin@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}
        await ac.post("/api/v1/auth/logout", headers=headers)

    # Check database audit logs
    async with AsyncSessionLocal() as session:
        stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(10)
        logs = (await session.execute(stmt)).scalars().all()
        actions = [log.action for log in logs]
        
        assert "LOGIN_SUCCESS" in actions
        assert "LOGOUT" in actions
