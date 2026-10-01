"""
Event Bus and WebSocket Connection Manager Adapter.
Section 11 — Real-Time Event System.
"""
from backend.app.engine.events import (
    ws_manager,
    EventPublisher,
    EventEnvelope,
    EventType,
    SubscriptionTopic,
    metrics_tracker
)

# Export for backward compatibility across modules
__all__ = [
    "ws_manager",
    "EventPublisher",
    "EventEnvelope",
    "EventType",
    "SubscriptionTopic",
    "metrics_tracker"
]

