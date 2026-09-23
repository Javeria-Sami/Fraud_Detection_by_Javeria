"""
Unit and Integration Test Suite for Section 11 — Real-Time Event System.
Validates WebSocket connection lifecycle, JWT authentication, RBAC filtering,
topic subscriptions, heartbeat keepalive, event envelope standardization,
data sanitization, multi-client fan-out, and telemetry metrics.
"""
import pytest
import asyncio
import json
import uuid
from datetime import datetime, timezone
from starlette.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.models.transaction import Transaction
from backend.app.models.alert import Alert
from backend.app.engine.risk.types import RiskResult, RiskLevel
from backend.app.engine.events.types import EventEnvelope, EventType, SubscriptionTopic
from backend.app.engine.events.config import EventSystemConfig, default_event_config
from backend.app.engine.events.manager import RealtimeConnectionManager, ws_manager
from backend.app.engine.events.publisher import EventPublisher
from backend.app.engine.events.metrics import metrics_tracker


# ---------------------------------------------------------------------------
# Event Envelope & Data Safety Tests
# ---------------------------------------------------------------------------

def test_event_envelope_structure_and_versioning():
    """Verify standardized event envelope metadata, schema version, and UUID."""
    envelope = EventEnvelope(
        event_type=EventType.ALERT_CREATED.value,
        entity_type="alert",
        entity_id="ALT-12345",
        severity="CRITICAL",
        payload={"risk_score": 95.0, "reason": "Severe anomaly detected."}
    )
    
    assert envelope.schema_version == "1.0"
    assert envelope.source == "fraud_platform_backend"
    assert envelope.event_type == "alert.created"
    assert envelope.entity_id == "ALT-12345"
    assert envelope.severity == "CRITICAL"
    assert envelope.event_id is not None
    assert len(envelope.event_id) > 10
    assert "occurred_at" in envelope.model_dump()


@pytest.mark.asyncio
async def test_event_publisher_sanitizes_sensitive_data():
    """Verify that EventPublisher strips sensitive credentials, tokens, and raw secrets."""
    txn = Transaction(
        id="TX-SAFE-1",
        transaction_id="TX-SAFE-1",
        user_id="USR-CUST-1001",
        user_name="John Doe",
        merchant_name="Amazon Store",
        merchant_category="Retail",
        device_id="DEV-001",
        amount=250.0,
        currency="USD",
        payment_method="CREDIT_CARD",
        status="APPROVED"
    )

    envelope = await EventPublisher.publish_transaction_created(txn)
    payload = envelope.payload
    
    # Assert essential fields exist
    assert payload["id"] == "TX-SAFE-1"
    assert payload["amount"] == 250.0
    assert payload["merchant_name"] == "Amazon Store"
    
    # Assert NO sensitive fields leaked
    assert "password" not in payload
    assert "hashed_password" not in payload
    assert "cvv" not in payload
    assert "pin" not in payload
    assert "token" not in payload


# ---------------------------------------------------------------------------
# WebSocket Authentication & Lifecycle Tests
# ---------------------------------------------------------------------------

def test_websocket_authentication_with_valid_query_token():
    """Verify connecting with valid JWT in query parameter succeeds and receives welcome frame."""
    client = TestClient(app)
    admin_token = create_access_token(data={"sub": "USR-ADMIN-01", "role": "ADMIN", "roles": ["ADMIN"], "permissions": ["*"]})

    with client.websocket_connect(f"/ws/live?token={admin_token}") as websocket:
        welcome_frame = websocket.receive_json()
        assert welcome_frame["event_type"] == "system.connected"
        assert welcome_frame["status"] == "LIVE"
        assert welcome_frame["user_id"] == "USR-ADMIN-01"
        assert welcome_frame["role"] == "ADMIN"
        assert "all" in welcome_frame["subscriptions"]


def test_websocket_authentication_rejected_with_invalid_token():
    """Verify connecting with invalid token is rejected with error frame and closed."""
    client = TestClient(app)
    with client.websocket_connect("/ws/live?token=invalid.jwt.signature") as websocket:
        msg = websocket.receive_json()
        assert msg["event_type"] == "system.error"
        assert "Authentication failed" in msg["message"]


def test_websocket_handshake_auth_message():
    """Verify connecting without query param and authenticating via first JSON frame."""
    client = TestClient(app)
    analyst_token = create_access_token(data={"sub": "USR-ANALYST-01", "role": "ANALYST", "roles": ["ANALYST"], "permissions": ["transaction.read", "alert.read"]})

    with client.websocket_connect("/ws/live") as websocket:
        # Send initial auth frame
        websocket.send_json({"action": "auth", "token": analyst_token})
        
        welcome_frame = websocket.receive_json()
        assert welcome_frame["event_type"] == "system.connected"
        assert welcome_frame["user_id"] == "USR-ANALYST-01"
        assert welcome_frame["role"] == "ANALYST"


def test_websocket_heartbeat_ping_pong():
    """Verify ping message receives pong response."""
    client = TestClient(app)
    admin_token = create_access_token(data={"sub": "USR-ADMIN-01", "role": "ADMIN", "roles": ["ADMIN"], "permissions": ["*"]})

    with client.websocket_connect(f"/ws/live?token={admin_token}") as websocket:
        # Consume welcome frame
        websocket.receive_json()

        # 1. Plain text ping
        websocket.send_text("ping")
        resp1 = websocket.receive_json()
        assert resp1["event_type"] == "system.heartbeat"
        assert resp1["status"] == "PONG"

        # 2. JSON control ping
        websocket.send_json({"action": "ping"})
        resp2 = websocket.receive_json()
        assert resp2["event_type"] == "system.heartbeat"
        assert resp2["status"] == "PONG"


def test_websocket_topic_subscription_management():
    """Verify subscribing and unsubscribing to specific event topics."""
    client = TestClient(app)
    admin_token = create_access_token(data={"sub": "USR-ADMIN-01", "role": "ADMIN", "roles": ["ADMIN"], "permissions": ["*"]})

    with client.websocket_connect(f"/ws/live?token={admin_token}") as websocket:
        websocket.receive_json() # Welcome

        # Subscribe to 'alerts'
        websocket.send_json({"action": "subscribe", "topic": "alerts"})
        sub_resp = websocket.receive_json()
        assert sub_resp["event_type"] == "system.subscription_updated"
        assert "alerts" in sub_resp["subscriptions"]

        # Unsubscribe from 'alerts'
        websocket.send_json({"action": "unsubscribe", "topic": "alerts"})
        unsub_resp = websocket.receive_json()
        assert unsub_resp["event_type"] == "system.subscription_updated"
        assert "alerts" not in unsub_resp["subscriptions"]


# ---------------------------------------------------------------------------
# Multi-Client Broadcast & Telemetry Metrics Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_event_broadcasting_to_multiple_clients():
    """Verify non-blocking fan-out broadcast delivering to multiple active subscribers."""
    client = TestClient(app)
    token1 = create_access_token(data={"sub": "USR-ADMIN-01", "role": "ADMIN", "roles": ["ADMIN"], "permissions": ["*"]})
    token2 = create_access_token(data={"sub": "USR-ANALYST-01", "role": "ANALYST", "roles": ["ANALYST"], "permissions": ["*"]})

    with client.websocket_connect(f"/ws/live?token={token1}") as ws1:
        ws1.receive_json() # Welcome 1
        with client.websocket_connect(f"/ws/live?token={token2}") as ws2:
            ws2.receive_json() # Welcome 2

            # Publish a test alert event
            envelope = EventEnvelope(
                event_type=EventType.ALERT_CREATED.value,
                entity_type="alert",
                entity_id="ALT-BROADCAST-1",
                severity="HIGH",
                payload={"title": "High Risk Gaming Attack", "score": 88.0}
            )
            await ws_manager.broadcast_envelope(envelope)

            # Both clients receive the event
            msg1 = ws1.receive_json()
            msg2 = ws2.receive_json()

            assert msg1["event_type"] == "alert.created"
            assert msg1["entity_id"] == "ALT-BROADCAST-1"
            assert msg2["event_type"] == "alert.created"
            assert msg2["entity_id"] == "ALT-BROADCAST-1"


@pytest.mark.asyncio
async def test_telemetry_metrics_endpoint():
    """Verify GET /api/v1/ws/metrics returns telemetry and connection snapshot."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_token = create_access_token(data={"sub": "USR-ADMIN-01", "role": "ADMIN", "roles": ["ADMIN"]})
        headers = {"Authorization": f"Bearer {admin_token}"}

        resp = await ac.get("/api/v1/ws/metrics", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "active_connections" in data
        assert "total_connections_opened" in data
        assert "total_events_published" in data
        assert "started_at" in data
