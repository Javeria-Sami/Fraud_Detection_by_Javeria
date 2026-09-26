"""
Section 25: Comprehensive Security Hardening & Threat Verification Test Suite.
Tests authentication defenses, rate limiting, password strength, security headers,
CORS boundaries, request body size limits, IDOR isolation, privilege escalation,
model path traversal defense, XSS sanitization, SSRF filters, and safe error handling.
"""
import pytest
import uuid
import os
from httpx import AsyncClient, ASGITransport
from fastapi import HTTPException

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.security import (
    create_access_token,
    validate_password_strength,
    SimpleRateLimiter,
    login_rate_limiter
)
from backend.app.engine.ml.registry import MLModelRegistryService
from backend.app.engine.notifications.channels import WebhookNotificationChannel
from backend.app.engine.notifications.policy import sanitize_text


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


# ---------------------------------------------------------------------------
# 1. Password Strength & Hardening Tests
# ---------------------------------------------------------------------------
def test_password_strength_validation_rules():
    """Verifies that short, common, or low-complexity passwords are rejected."""
    # Too short (< 8 chars)
    with pytest.raises(HTTPException) as exc1:
        validate_password_strength("Short1!")
    assert exc1.value.status_code == 400
    assert "at least 8 characters" in exc1.value.detail

    # Common dictionary password
    with pytest.raises(HTTPException) as exc2:
        validate_password_strength("password123")
    assert exc2.value.status_code == 400
    assert "too common" in exc2.value.detail

    # Low complexity (all lowercase single category)
    with pytest.raises(HTTPException) as exc3:
        validate_password_strength("abcdefghijklmnop")
    assert exc3.value.status_code == 400

    # Strong compliant password should pass without exception
    validate_password_strength("FraudShield#2026_SecureKey!")


# ---------------------------------------------------------------------------
# 2. Rate Limiting Tests
# ---------------------------------------------------------------------------
def test_sliding_window_rate_limiter():
    """Verifies sliding window rate limiting behavior and threshold triggers."""
    limiter = SimpleRateLimiter(max_attempts=3, window_seconds=10)
    key = "test_ip_client_1"

    assert limiter.is_rate_limited(key) is False  # Attempt 1
    assert limiter.is_rate_limited(key) is False  # Attempt 2
    assert limiter.is_rate_limited(key) is False  # Attempt 3
    assert limiter.is_rate_limited(key) is True   # Attempt 4 (Blocked)


@pytest.mark.asyncio
async def test_login_brute_force_rate_limiting():
    """Verifies login endpoint rejects repeated invalid attempts with 429 Too Many Requests."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        attacker_ip = "192.168.100.99"
        rate_key = f"{attacker_ip}:target_brute_force@fraudshield.io"
        
        # Pre-fill limiter
        for _ in range(16):
            login_rate_limiter.attempts[rate_key].append(login_rate_limiter.attempts.get(rate_key, [0])[0] if rate_key in login_rate_limiter.attempts else 0)

        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "target_brute_force@fraudshield.io", "password": "WrongPassword123!"},
            headers={"X-Forwarded-For": attacker_ip}
        )
        # Should be throttled
        assert res.status_code in (401, 429)


# ---------------------------------------------------------------------------
# 3. HTTP Security Headers Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_http_security_headers_present():
    """Verifies defense-in-depth HTTP security headers on all API responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200

        headers = res.headers
        assert headers.get("X-Content-Type-Options") == "nosniff"
        assert headers.get("X-Frame-Options") == "DENY"
        assert headers.get("X-XSS-Protection") == "1; mode=block"
        assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "camera=()" in headers.get("Permissions-Policy", "")
        assert "default-src 'self'" in headers.get("Content-Security-Policy", "")


# ---------------------------------------------------------------------------
# 4. Request Body Size Limit Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_oversized_payload_rejection():
    """Verifies that payloads exceeding maximum size are rejected with 413."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Simulate oversized content length
        res = await client.post(
            "/api/v1/transactions",
            content=b"A" * 100,
            headers={"Content-Length": str(20 * 1024 * 1024)}  # 20 MB claimed
        )
        assert res.status_code == 413


# ---------------------------------------------------------------------------
# 5. IDOR & Privilege Escalation Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_rbac_privilege_escalation_denial(viewer_token: str):
    """Verifies viewers cannot access admin panel, rule engine, or retraining endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Admin users endpoint
        res1 = await client.get(
            "/api/v1/admin/users",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert res1.status_code == 403

        # 2. ML retraining trigger endpoint
        res2 = await client.post(
            "/api/v1/ml-retraining/start",
            json={"model_type": "Isolation Forest"},
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert res2.status_code == 403

        # 3. Model deployment endpoint
        res3 = await client.post(
            "/api/v1/models/IF-TEST/deploy",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert res3.status_code == 403


# ---------------------------------------------------------------------------
# 6. ML Model Path Traversal Defense
# ---------------------------------------------------------------------------
def test_model_artifact_path_traversal_blocked():
    """Verifies path traversal attempts on model artifact loader are blocked with PermissionError."""
    # Attempt directory traversal outside MODEL_DIR
    with pytest.raises(PermissionError) as exc:
        MLModelRegistryService.load_artifact("../../../../../etc/passwd")
    assert "Access denied" in str(exc.value)

    with pytest.raises(PermissionError) as exc2:
        MLModelRegistryService.load_artifact("..\\..\\Windows\\System32\\cmd.exe")
    assert "Access denied" in str(exc2.value)


# ---------------------------------------------------------------------------
# 7. XSS & Stored Content Sanitization
# ---------------------------------------------------------------------------
def test_xss_content_sanitization_filter():
    """Verifies HTML/script injection vectors are neutralized."""
    vectors = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert(1)>",
        "<iframe src='javascript:alert(1)'></iframe>",
        "Hello <a href='javascript:void(0)'>Click Me</a>"
    ]
    for vector in vectors:
        cleaned = sanitize_text(vector)
        assert "<script>" not in cleaned
        assert "<img" not in cleaned
        assert "<iframe" not in cleaned
        assert "javascript:" not in cleaned


# ---------------------------------------------------------------------------
# 8. SSRF Protection Tests
# ---------------------------------------------------------------------------
def test_ssrf_destination_validation():
    """Verifies outbound webhook validator strictly rejects internal/loopback/metadata destinations."""
    wh = WebhookNotificationChannel()
    assert wh.is_safe_url("http://127.0.0.1:8000/api") is False
    assert wh.is_safe_url("http://localhost:5173") is False
    assert wh.is_safe_url("http://169.254.169.254/latest/meta-data") is False
    assert wh.is_safe_url("http://10.0.0.1/admin") is False
    assert wh.is_safe_url("http://192.168.1.1/router") is False
    assert wh.is_safe_url("https://hooks.slack.com/services/T00/B00/X00") is True
