"""
Unit and Integration Tests for Section 24: Notification System.
Tests notification generation, policy evaluation, recipient resolution, preferences,
deduplication, cooldowns, channel deliveries, IDOR protection, and REST APIs.
"""
import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.user import User
from backend.app.models.alert import Alert
from backend.app.models.case import Case
from backend.app.models.notification import (
    Notification,
    NotificationType,
    NotificationCategory,
    NotificationSeverity,
    NotificationPriority,
    NotificationChannelType
)
from backend.app.engine.notifications.policy import NotificationPolicyService, sanitize_text
from backend.app.engine.notifications.channels import WebhookNotificationChannel, InAppNotificationChannel, EmailNotificationChannel
from backend.app.engine.notifications.service import NotificationService


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


def test_content_sanitization():
    """Verifies XSS and script tags are stripped and escaped."""
    raw_payload = "<script>alert('xss')</script><b>Critical Alert Detected</b>"
    cleaned = sanitize_text(raw_payload)
    assert "<script>" not in cleaned
    assert "<b>" not in cleaned
    assert "Critical Alert Detected" in cleaned


def test_webhook_ssrf_validation():
    """Verifies SSRF filter blocks private and loopback destinations."""
    wh = WebhookNotificationChannel()
    assert wh.is_safe_url("http://127.0.0.1:8000/hook") is False
    assert wh.is_safe_url("http://localhost:3000/hook") is False
    assert wh.is_safe_url("http://169.254.169.254/latest/meta-data") is False
    assert wh.is_safe_url("https://api.external-security-service.com/webhook") is True


@pytest.mark.asyncio
async def test_policy_alert_notification_creation():
    """Verifies that an alert event creates a persisted notification with mapped severity."""
    async with AsyncSessionLocal() as session:
        alert_id = f"ALT-TEST-{uuid.uuid4().hex[:6]}"
        alert = Alert(
            id=alert_id,
            alert_id=alert_id,
            transaction_id="TXN-TEST-12345",
            user_id="USR-TEST-01",
            title="Critical Velocity Spike Detected",
            description="Transaction rate exceeded maximum velocity limit.",
            severity="CRITICAL",
            status="NEW",
            risk_score=95.0,
            alert_reason="Velocity breach",
            triggered_rules=[]
        )
        session.add(alert)
        await session.flush()

        notifs = await NotificationPolicyService.handle_alert_event(
            session=session,
            alert=alert,
            event_type="alert.created"
        )
        await session.commit()

        assert len(notifs) > 0
        first_notif = notifs[0]
        assert first_notif.severity == NotificationSeverity.CRITICAL.value
        assert first_notif.priority == NotificationPriority.URGENT.value
        assert first_notif.category == NotificationCategory.SECURITY_ALERTS.value
        assert first_notif.source_type == "ALERT"
        assert first_notif.source_id == alert_id


@pytest.mark.asyncio
async def test_notification_deduplication_and_cooldown():
    """Verifies deterministic deduplication prevents notification storm on repeated events."""
    async with AsyncSessionLocal() as session:
        recipients = await NotificationPolicyService.resolve_recipients(session, roles=["ADMIN"])
        assert len(recipients) > 0
        target_user = recipients[0]

        # First dispatch
        n1 = await NotificationPolicyService.dispatch_notification(
            session=session,
            recipient=target_user,
            notification_type=NotificationType.MODEL_HEALTH_WARNING.value,
            category=NotificationCategory.MODEL_MONITORING.value,
            title="Model Drift Warning",
            message="Feature drift detected on Isolation Forest",
            severity=NotificationSeverity.WARNING.value,
            priority=NotificationPriority.NORMAL.value,
            source_type="MODEL",
            source_id="ML-TEST-DEDUP"
        )
        await session.commit()
        assert n1 is not None

        # Immediate repeated dispatch with same condition should be suppressed by cooldown
        n2 = await NotificationPolicyService.dispatch_notification(
            session=session,
            recipient=target_user,
            notification_type=NotificationType.MODEL_HEALTH_WARNING.value,
            category=NotificationCategory.MODEL_MONITORING.value,
            title="Model Drift Warning",
            message="Feature drift detected on Isolation Forest",
            severity=NotificationSeverity.WARNING.value,
            priority=NotificationPriority.NORMAL.value,
            source_type="MODEL",
            source_id="ML-TEST-DEDUP"
        )
        assert n2 is None  # Suppressed by cooldown


@pytest.mark.asyncio
async def test_notifications_api_lifecycle(admin_token: str):
    """Tests listing, unread-count, marking as read, and dismissing notifications via REST API."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch unread counts
        res = await client.get(
            "/api/v1/notifications/unread-count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        counts = res.json()
        assert "unread_count" in counts
        assert "critical_count" in counts

        # 2. List notifications
        list_res = await client.get(
            "/api/v1/notifications?page=1&page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert "items" in list_data
        assert "total" in list_data

        if list_data["items"]:
            target_notif = list_data["items"][0]
            notif_id = target_notif["id"]

            # 3. Get single detail
            detail_res = await client.get(
                f"/api/v1/notifications/{notif_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert detail_res.status_code == 200
            assert detail_res.json()["id"] == notif_id

            # 4. Mark single as read
            read_res = await client.patch(
                f"/api/v1/notifications/{notif_id}/read",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert read_res.status_code == 200
            assert read_res.json()["read_at"] is not None

        # 5. Mark all as read
        all_read_res = await client.post(
            "/api/v1/notifications/read-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert all_read_res.status_code == 200
        assert "count" in all_read_res.json()


@pytest.mark.asyncio
async def test_notification_preferences_and_mandatory_enforcement(admin_token: str):
    """Verifies preference updates and enforces that mandatory Security alerts cannot be disabled in-app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Get preferences
        get_res = await client.get(
            "/api/v1/notifications/preferences",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_res.status_code == 200
        prefs = get_res.json()["preferences"]
        assert len(prefs) > 0

        # 2. Attempt to disable mandatory SECURITY_ALERTS on IN_APP
        update_payload = {
            "preferences": [
                {
                    "category": "SECURITY_ALERTS",
                    "channel": "IN_APP",
                    "enabled": False  # Should be overridden to True by mandatory policy
                },
                {
                    "category": "MODEL_MONITORING",
                    "channel": "EMAIL",
                    "enabled": False
                }
            ]
        }
        put_res = await client.put(
            "/api/v1/notifications/preferences",
            json=update_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_res.status_code == 200
        updated_prefs = put_res.json()["preferences"]
        
        # Verify mandatory IN_APP remains enabled
        sec_inapp = next(p for p in updated_prefs if p["category"] == "SECURITY_ALERTS" and p["channel"] == "IN_APP")
        assert sec_inapp["enabled"] is True
        assert sec_inapp["is_mandatory"] is True


@pytest.mark.asyncio
async def test_idor_protection(admin_token: str, viewer_token: str):
    """Verifies that User A cannot view or modify User B's notification."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a notification strictly for USR-ADMIN-01
        async with AsyncSessionLocal() as session:
            notif = Notification(
                id=f"notif-idor-{uuid.uuid4().hex[:8]}",
                recipient_user_id="USR-ADMIN-01",
                notification_type="SECURITY_ALERT",
                category="SECURITY_ALERTS",
                title="Admin Confidential Incident",
                message="Sensitive internal security notice.",
                severity="HIGH",
                priority="HIGH"
            )
            session.add(notif)
            await session.commit()
            target_id = notif.id

        # Viewer (USR-VIEWER-01) attempts to inspect admin's notification -> Should be 404 (IDOR blocked)
        forbidden_get = await client.get(
            f"/api/v1/notifications/{target_id}",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert forbidden_get.status_code == 404

        # Viewer attempts to mark read -> Should be 404
        forbidden_patch = await client.patch(
            f"/api/v1/notifications/{target_id}/read",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert forbidden_patch.status_code == 404
