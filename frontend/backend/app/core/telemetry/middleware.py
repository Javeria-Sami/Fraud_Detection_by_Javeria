"""
FastAPI Request Correlation & Telemetry Middleware.
Section 28 — Observability.

Responsibilities:
1. Ingests or generates unique X-Request-ID and X-Trace-ID headers.
2. Injects correlation identifiers into async ContextVars for structured logging and distributed tracing.
3. Records HTTP metrics (request counts, durations, status codes, active gauges).
4. Catches unhandled exceptions, logs diagnostic context, and returns sanitized RFC-7807 error responses.
"""
import uuid
import time
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from backend.app.core.logging import (
    ctx_request_id,
    ctx_trace_id,
    ctx_span_id,
    get_logger,
    redact_sensitive_data
)
from backend.app.core.telemetry.metrics import metrics
from backend.app.core.telemetry.tracer import global_tracer

logger = get_logger("http_telemetry_middleware")


class TelemetryMiddleware(BaseHTTPMiddleware):
    """
    Middleware establishing request correlation and telemetry tracking for every HTTP interaction.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()

        # 1. Resolve or generate Request ID & Trace ID
        req_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
        trace_id = request.headers.get("X-Trace-ID") or uuid.uuid4().hex

        # 2. Bind to ContextVars
        ctx_request_id.set(req_id)
        ctx_trace_id.set(trace_id)

        # 3. Track in-flight gauge and start root HTTP span
        metrics.http_active_requests.inc()
        span = global_tracer.start_span(
            name=f"HTTP {request.method} {request.url.path}",
            trace_id=trace_id,
            tags={
                "http.method": request.method,
                "http.url": str(request.url),
                "http.path": request.url.path,
                "client.ip": request.client.host if request.client else "unknown",
            }
        )

        try:
            response = await call_next(request)

            # Record duration & metric
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            span.set_tag("http.status_code", response.status_code)
            metrics.http_request_duration_ms.observe(duration_ms)

            # Low-cardinality status metric labels
            status_bucket = f"{response.status_code // 100}xx"
            metrics.http_requests_total.inc(labels={"method": request.method, "status": status_bucket})

            if response.status_code >= 400:
                metrics.http_request_errors_total.inc(labels={"method": request.method, "status": str(response.status_code)})
                if response.status_code >= 500:
                    span.set_error(f"HTTP {response.status_code} Error")

            # Attach correlation headers to response
            response.headers["X-Request-ID"] = req_id
            response.headers["X-Trace-ID"] = trace_id
            return response

        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            metrics.http_request_errors_total.inc(labels={"method": request.method, "status": "500"})
            span.set_error(str(exc), error_type=type(exc).__name__)

            logger.error(
                "Unhandled exception during HTTP request processing: %s",
                str(exc),
                exc_info=True,
                extra={"structured_extra": {"path": request.url.path, "method": request.method, "duration_ms": duration_ms}}
            )

            # Return secure sanitized error payload without leaking internal stack traces
            err_payload = {
                "error": "InternalServerError",
                "message": "An unexpected error occurred while processing your request.",
                "request_id": req_id,
                "status_code": 500
            }
            err_response = JSONResponse(status_code=500, content=err_payload)
            err_response.headers["X-Request-ID"] = req_id
            err_response.headers["X-Trace-ID"] = trace_id
            return err_response

        finally:
            metrics.http_active_requests.dec()
            global_tracer.record_completed_span(span)
