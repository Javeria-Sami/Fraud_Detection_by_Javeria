"""
Production Authentication, Vercel Serverless Entrypoint, and CORS Flow Tests.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.core.security import create_access_token
from api.index import app as vercel_app


@pytest.mark.asyncio
async def test_admin_production_login():
    """Verify Admin demo credentials work and return complete auth payload."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@fraudshield.io", "password": "Admin@123456"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["email"] == "admin@fraudshield.io"
        assert data["role"] == "admin"
        assert "*" in data["permissions"]


@pytest.mark.asyncio
async def test_analyst_production_login():
    """Verify Analyst demo credentials work and return analyst role."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "analyst@fraudshield.io", "password": "Analyst@123456"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "analyst@fraudshield.io"
        assert data["role"] == "analyst"


@pytest.mark.asyncio
async def test_viewer_production_login():
    """Verify Viewer demo credentials work and return viewer role."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "viewer@fraudshield.io", "password": "Viewer@123456"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "viewer@fraudshield.io"
        assert data["role"] == "viewer"


@pytest.mark.asyncio
async def test_invalid_password_rejected():
    """Verify invalid password returns 401 Unauthorized."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@fraudshield.io", "password": "WrongPassword999!"}
        )
        assert res.status_code == 401
        assert "Incorrect email or password" in res.json()["detail"]


@pytest.mark.asyncio
async def test_unknown_user_rejected():
    """Verify unknown user returns 401 Unauthorized."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "unknown_hacker@example.com", "password": "SomePassword123!"}
        )
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_auth_me_current_user():
    """Verify /auth/me returns authenticated user details."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Generate valid token
        token = create_access_token({"sub": "USR-ADMIN-01", "email": "admin@fraudshield.io", "role": "admin"})
        res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "admin@fraudshield.io"


@pytest.mark.asyncio
async def test_cors_vercel_origin_allowed():
    """Verify CORS preflight allows Vercel frontend domains."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {
            "Origin": "https://fraudshield-preview-123.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type"
        }
        res = await client.options("/api/v1/auth/login", headers=headers)
        assert res.status_code == 200
        assert res.headers.get("access-control-allow-origin") == "https://fraudshield-preview-123.vercel.app"
        assert res.headers.get("access-control-allow-credentials") == "true"


def test_vercel_serverless_app_import():
    """Verify that api.index exports the valid ASGI FastAPI instance."""
    assert vercel_app is not None
    assert vercel_app.title == app.title
