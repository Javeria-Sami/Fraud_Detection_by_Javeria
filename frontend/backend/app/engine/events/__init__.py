"""
Real-Time Event System Module Exports.
Section 11 — Real-Time Event System.
"""
from backend.app.engine.events.types import (
    EventType,
    SubscriptionTopic,
    ClientConnectionState,
    EventEnvelope,
    ClientMessage
)
from backend.app.engine.events.config import EventSystemConfig, default_event_config, EVENT_SYSTEM_VERSION
from backend.app.engine.events.metrics import RealtimeMetrics, metrics_tracker
from backend.app.engine.events.manager import RealtimeConnectionManager, ClientSession, ws_manager
from backend.app.engine.events.publisher import EventPublisher

__all__ = [
    "EventType",
    "SubscriptionTopic",
    "ClientConnectionState",
    "EventEnvelope",
    "ClientMessage",
    "EventSystemConfig",
    "default_event_config",
    "EVENT_SYSTEM_VERSION",
    "RealtimeMetrics",
    "metrics_tracker",
    "RealtimeConnectionManager",
    "ClientSession",
    "ws_manager",
    "EventPublisher"
]
