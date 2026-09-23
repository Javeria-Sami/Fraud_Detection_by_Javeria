"""
Real-Time WebSocket Connection Manager with RBAC and Topic Subscriptions.
Section 11 — Real-Time Event System.
"""
import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Set, List, Optional, Any
from fastapi import WebSocket

from backend.app.engine.events.types import EventEnvelope, SubscriptionTopic
from backend.app.engine.events.config import EventSystemConfig, default_event_config
from backend.app.engine.events.metrics import metrics_tracker

logger = logging.getLogger("realtime_connection_manager")

# Mapping event categories to required read permissions
EVENT_PERMISSION_REQUIREMENTS: Dict[str, str] = {
    "transaction": "transaction.read",
    "risk": "transaction.read",
    "alert": "alert.read",
    "model": "model.read",
    "system": "analytics.read"
}


class ClientSession:
    """Represents an active, authenticated WebSocket client session."""
    def __init__(
        self,
        websocket: WebSocket,
        user_id: str,
        role: str,
        permissions: Set[str],
        subscriptions: Optional[Set[str]] = None
    ):
        self.websocket = websocket
        self.user_id = user_id
        self.role = role.upper()
        self.permissions = permissions
        self.subscriptions = subscriptions or {"all"}
        self.connected_at = datetime.now(timezone.utc)
        self.last_heartbeat = datetime.now(timezone.utc)

    def is_authorized_for_event(self, event_type: str, topic: str) -> bool:
        """Verifies if the client is subscribed and permitted by RBAC to receive this event."""
        # 1. Check Topic Subscription
        if "all" not in self.subscriptions and topic not in self.subscriptions:
            return False

        # 2. Check RBAC Permissions (ADMIN has full wildcard access)
        if self.role == "ADMIN" or "*" in self.permissions:
            return True

        category = event_type.split(".")[0]
        required_perm = EVENT_PERMISSION_REQUIREMENTS.get(category)
        if required_perm and required_perm not in self.permissions:
            return False

        return True


class RealtimeConnectionManager:
    """
    Central connection orchestrator managing authentication, RBAC filtering,
    heartbeats, subscriptions, and non-blocking event fan-out.
    """
    def __init__(self, config: Optional[EventSystemConfig] = None):
        self.config = config or default_event_config
        self._sessions: Dict[WebSocket, ClientSession] = {}
        self._lock = asyncio.Lock()

    @property
    def active_connection_count(self) -> int:
        return len(self._sessions)

    async def register_connection(
        self,
        websocket: WebSocket,
        user_payload: Dict[str, Any],
        initial_topics: Optional[List[str]] = None
    ) -> ClientSession:
        """
        Accepts and registers an authenticated WebSocket client session.
        """
        if len(self._sessions) >= self.config.max_connections:
            logger.warning("Connection rejected: Max connections limit reached (%s)", self.config.max_connections)
            await websocket.close(code=1013, reason="Maximum connection capacity reached.")
            raise ConnectionRefusedError("Maximum connection capacity reached.")

        user_id = user_payload.get("sub", user_payload.get("user_id", "UNKNOWN_USER"))
        role = user_payload.get("role", "VIEWER").upper()
        
        raw_perms = user_payload.get("permissions", [])
        permissions = set(raw_perms) if isinstance(raw_perms, (list, set)) else set()
        if role == "ADMIN":
            permissions.add("*")

        # Determine default topics based on user role
        if initial_topics:
            subscriptions = set(t.lower() for t in initial_topics)
        else:
            subscriptions = {"all"} if role in ("ADMIN", "ANALYST") else {"transactions", "system"}

        session = ClientSession(
            websocket=websocket,
            user_id=user_id,
            role=role,
            permissions=permissions,
            subscriptions=subscriptions
        )

        async with self._lock:
            self._sessions[websocket] = session
            metrics_tracker.record_connect()

        logger.info("Registered WebSocket client: user=%s, role=%s, active=%d", user_id, role, len(self._sessions))
        return session

    async def remove_connection(self, websocket: WebSocket):
        """Removes a client session upon disconnect."""
        async with self._lock:
            if websocket in self._sessions:
                session = self._sessions.pop(websocket)
                metrics_tracker.record_disconnect()
                logger.info("Removed WebSocket client: user=%s, remaining=%d", session.user_id, len(self._sessions))

    async def update_subscriptions(
        self,
        websocket: WebSocket,
        subscribe: Optional[List[str]] = None,
        unsubscribe: Optional[List[str]] = None
    ) -> Set[str]:
        """Modifies client topic subscriptions with authorization checks."""
        session = self._sessions.get(websocket)
        if not session:
            return set()

        if subscribe:
            for topic in subscribe:
                t_lower = topic.lower().strip()
                # Check topic permission
                if t_lower == "alerts" and session.role not in ("ADMIN", "ANALYST") and "alert.read" not in session.permissions:
                    continue
                session.subscriptions.add(t_lower)

        if unsubscribe:
            for topic in unsubscribe:
                session.subscriptions.discard(topic.lower().strip())

        return set(session.subscriptions)

    async def broadcast_envelope(self, envelope: EventEnvelope, topic: Optional[str] = None):
        """
        Non-blocking fan-out broadcast to all authorized, subscribed WebSocket clients.
        """
        event_type = envelope.event_type
        target_topic = topic or event_type.split(".")[0]
        message_json = envelope.model_dump_json()

        metrics_tracker.record_publish(event_type)

        dead_sockets: List[WebSocket] = []
        delivery_success_count = 0
        delivery_failure_count = 0

        # Snapshot active sessions
        async with self._lock:
            sessions_snapshot = list(self._sessions.items())

        for ws, session in sessions_snapshot:
            if session.is_authorized_for_event(event_type, target_topic):
                try:
                    await ws.send_text(message_json)
                    delivery_success_count += 1
                except Exception as e:
                    logger.debug("Failed sending event to user %s: %s", session.user_id, str(e))
                    dead_sockets.append(ws)
                    delivery_failure_count += 1

        # Clean up dead sockets
        if dead_sockets:
            for dead_ws in dead_sockets:
                await self.remove_connection(dead_ws)

        metrics_tracker.record_delivery_success(delivery_success_count)
        if delivery_failure_count > 0:
            metrics_tracker.record_delivery_failure(delivery_failure_count)

    async def broadcast_event(self, event_type: str, entity_id: str, payload: Dict[str, Any], correlation_id: Optional[str] = None):
        """Compatibility broadcast method creating a standard EventEnvelope."""
        envelope = EventEnvelope(
            event_type=event_type,
            entity_type=event_type.split(".")[0],
            entity_id=entity_id,
            correlation_id=correlation_id,
            payload=payload
        )
        await self.broadcast_envelope(envelope)

    async def graceful_shutdown(self):
        """Closes all active client connections during application shutdown."""
        logger.info("Initiating graceful shutdown for %d active WebSocket connections.", len(self._sessions))
        async with self._lock:
            for ws in list(self._sessions.keys()):
                try:
                    await ws.send_json({"event_type": "system.shutdown", "message": "Server shutting down."})
                    await ws.close(code=1001, reason="Server shutting down.")
                except Exception:
                    pass
            self._sessions.clear()


# Default global instance
ws_manager = RealtimeConnectionManager()
