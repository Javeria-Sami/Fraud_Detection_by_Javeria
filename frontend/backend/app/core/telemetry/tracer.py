"""
Lightweight In-Process Distributed Tracing System.
Section 28 — Observability.

Provides:
1. Distributed Trace & Span Context lifecycle management.
2. Parent-child span hierarchy and duration measurement.
3. Configurable trace sampling rates and error/slow-request auto-sampling.
4. Recent sampled trace buffer for operational diagnostic inspection.
"""
import uuid
import time
import random
from typing import Dict, List, Optional, Any
from contextvars import ContextVar
from collections import deque
from backend.app.core.logging import ctx_trace_id, ctx_span_id, ctx_request_id, redact_sensitive_data


class Span:
    """Represents an individual unit of work within a distributed trace."""
    def __init__(
        self,
        name: str,
        trace_id: str,
        span_id: Optional[str] = None,
        parent_span_id: Optional[str] = None,
        tags: Optional[Dict[str, Any]] = None
    ):
        self.name = name
        self.trace_id = trace_id
        self.span_id = span_id or uuid.uuid4().hex[:16]
        self.parent_span_id = parent_span_id
        self.start_time = time.perf_counter()
        self.end_time: Optional[float] = None
        self.duration_ms: float = 0.0
        self.status: str = "OK"
        self.tags: Dict[str, Any] = redact_sensitive_data(tags or {})
        self.events: List[Dict[str, Any]] = []

    def set_tag(self, key: str, value: Any) -> "Span":
        """Adds a sanitized key-value tag to the span."""
        clean_val = redact_sensitive_data({key: value})
        self.tags.update(clean_val)
        return self

    def set_error(self, error_message: str, error_type: Optional[str] = None) -> "Span":
        """Marks the span as failed with diagnostic error context."""
        self.status = "ERROR"
        self.tags["error"] = True
        self.tags["error_message"] = str(error_message)
        if error_type:
            self.tags["error_type"] = str(error_type)
        return self

    def finish(self) -> float:
        """Finishes the span and calculates duration."""
        if self.end_time is None:
            self.end_time = time.perf_counter()
            self.duration_ms = round((self.end_time - self.start_time) * 1000.0, 3)
        return self.duration_ms

    def to_dict(self) -> Dict[str, Any]:
        """Serializes span to a structured dictionary."""
        return {
            "name": self.name,
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "parent_span_id": self.parent_span_id,
            "duration_ms": self.duration_ms,
            "status": self.status,
            "tags": self.tags,
            "events": self.events,
            "timestamp": round(time.time(), 3)
        }


class Tracer:
    """
    Centralized distributed tracing manager with buffer and sampling policy.
    """
    def __init__(self, sample_rate: float = 1.0, max_retained_traces: int = 200):
        self.sample_rate = max(0.0, min(1.0, sample_rate))
        self._trace_buffer: deque = deque(maxlen=max_retained_traces)

    def should_sample(self, is_error: bool = False, duration_ms: float = 0.0) -> bool:
        """Sampling policy: Always sample errors and slow requests (>500ms), probabilistically sample normal requests."""
        if is_error or duration_ms > 500.0:
            return True
        return random.random() < self.sample_rate

    def start_span(
        self,
        name: str,
        trace_id: Optional[str] = None,
        parent_span_id: Optional[str] = None,
        tags: Optional[Dict[str, Any]] = None
    ) -> Span:
        """Starts a new span and attaches it to the current async context."""
        active_trace_id = trace_id or ctx_trace_id.get() or uuid.uuid4().hex
        active_parent_id = parent_span_id or ctx_span_id.get()

        span = Span(
            name=name,
            trace_id=active_trace_id,
            parent_span_id=active_parent_id,
            tags=tags
        )

        ctx_trace_id.set(active_trace_id)
        ctx_span_id.set(span.span_id)
        return span

    def record_completed_span(self, span: Span) -> None:
        """Stores completed span in in-memory diagnostics buffer if sampled."""
        span.finish()
        if self.should_sample(is_error=(span.status == "ERROR"), duration_ms=span.duration_ms):
            self._trace_buffer.append(span.to_dict())

    def get_recent_traces(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Returns recent sampled spans for the observability dashboard."""
        return list(self._trace_buffer)[-limit:]


# Global Tracer Instance
global_tracer = Tracer(sample_rate=1.0)
