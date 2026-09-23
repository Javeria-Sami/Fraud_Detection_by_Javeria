"""
Real-Time Event System Configuration.
Section 11 — Real-Time Event System.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict
from backend.app.core.config import settings

EVENT_SYSTEM_VERSION = "event-v1.0.0"


class EventSystemConfig(BaseModel):
    """Configuration for real-time WebSocket connections, heartbeats, and rate limits."""
    version: str = EVENT_SYSTEM_VERSION
    heartbeat_interval_seconds: int = Field(15, ge=1, le=120)
    connection_timeout_seconds: int = Field(45, ge=5, le=300)
    max_connections: int = Field(500, ge=1, le=10000)
    max_message_size_bytes: int = Field(65536, ge=1024, le=1048576) # 64KB max per msg
    max_queue_size_per_client: int = Field(100, ge=10, le=1000)
    enable_metrics: bool = True
    allowed_origins: List[str] = Field(default_factory=lambda: list(settings.BACKEND_CORS_ORIGINS))

    model_config = ConfigDict(from_attributes=True)


default_event_config = EventSystemConfig()
