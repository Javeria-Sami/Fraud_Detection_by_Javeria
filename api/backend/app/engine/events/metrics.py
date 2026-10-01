"""
Real-Time Event System Telemetry and Metrics Tracker.
Section 11 — Real-Time Event System.
"""
from typing import Dict, Any
from datetime import datetime, timezone
import asyncio


class RealtimeMetrics:
    """In-memory telemetry tracker for real-time WebSocket connection performance and broadcast events."""
    def __init__(self):
        self._lock = asyncio.Lock()
        self.active_connections: int = 0
        self.peak_connections: int = 0
        self.total_connections_opened: int = 0
        self.total_connections_closed: int = 0
        self.total_events_published: int = 0
        self.total_events_delivered: int = 0
        self.total_delivery_failures: int = 0
        self.events_by_type: Dict[str, int] = {}
        self.started_at: str = datetime.now(timezone.utc).isoformat()

    def record_connect(self):
        self.active_connections += 1
        self.total_connections_opened += 1
        if self.active_connections > self.peak_connections:
            self.peak_connections = self.active_connections

    def record_disconnect(self):
        if self.active_connections > 0:
            self.active_connections -= 1
        self.total_connections_closed += 1

    def record_publish(self, event_type: str):
        self.total_events_published += 1
        self.events_by_type[event_type] = self.events_by_type.get(event_type, 0) + 1

    def record_delivery_success(self, count: int = 1):
        self.total_events_delivered += count

    def record_delivery_failure(self, count: int = 1):
        self.total_delivery_failures += count

    def get_snapshot(self) -> Dict[str, Any]:
        return {
            "active_connections": self.active_connections,
            "peak_connections": self.peak_connections,
            "total_connections_opened": self.total_connections_opened,
            "total_connections_closed": self.total_connections_closed,
            "total_events_published": self.total_events_published,
            "total_events_delivered": self.total_events_delivered,
            "total_delivery_failures": self.total_delivery_failures,
            "events_by_type": dict(self.events_by_type),
            "started_at": self.started_at,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


metrics_tracker = RealtimeMetrics()
