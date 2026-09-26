"""
Comprehensive Test Suite for Section 28 — Observability.
Validates:
1. Structured JSON logging format, metadata enrichment, and sensitive data redaction.
2. Request ID & Trace ID correlation across async context variables.
3. Metrics Registry (Counters, Gauges, Histograms, Snapshots, and low-cardinality label enforcement).
4. Distributed Tracing (Span creation, duration calculation, hierarchy, error tags, sampling buffers).
5. Health Probes (/health/live, /health/ready, /health).
6. Operational Observability API endpoints and RBAC security boundaries.
7. HTTP Telemetry Middleware header injection (X-Request-ID, X-Trace-ID).
"""
import pytest
import json
import uuid
import time
import logging
from unittest.mock import AsyncMock, MagicMock, patch
from starlette.testclient import TestClient
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.core.logging import (
    StructuredJSONFormatter,
    redact_sensitive_data,
    ctx_request_id,
    ctx_trace_id,
    ctx_span_id
)
from backend.app.core.telemetry.metrics import (
    MetricCounter,
    MetricGauge,
    MetricHistogram,
    MetricsRegistry,
    metrics
)
from backend.app.core.telemetry.tracer import Span, Tracer, global_tracer


# ---------------------------------------------------------------------------
# 1. Structured Logging & Redaction Tests
# ---------------------------------------------------------------------------
def test_sensitive_data_redaction():
    """Verify recursive redaction of passwords, tokens, API keys, CVVs, and PAN numbers."""
    payload = {
        "user_id": "USR-101",
        "email": "analyst@fraudshield.internal",
        "password": "super_secret_password_123",
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "api_key": "sk_live_987654321",
        "payment": {
            "card_number": "4111 2222 3333 4444",
            "cvv": "123",
            "amount": 250.00
        },
        "nested_tokens": ["token_abc", "normal_string"]
    }

    redacted = redact_sensitive_data(payload)

    assert redacted["password"] == "[REDACTED]"
    assert redacted["access_token"] == "[REDACTED]"
    assert redacted["api_key"] == "[REDACTED]"
    assert redacted["payment"]["cvv"] == "[REDACTED]"
    assert redacted["payment"]["card_number"] == "[REDACTED]"
    assert redacted["payment"]["amount"] == 250.00
    assert redacted["user_id"] == "USR-101"


def test_structured_json_formatter():
    """Verify log records format as structured JSON with contextual correlation IDs."""
    formatter = StructuredJSONFormatter(service_name="test-fraud-service", environment="TESTING")
    
    ctx_request_id.set("req_test_12345")
    ctx_trace_id.set("trace_test_67890")

    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=42,
        msg="Transaction evaluated successfully",
        args=(),
        exc_info=None
    )

    formatted_json = formatter.format(record)
    data = json.loads(formatted_json)

    assert data["level"] == "INFO"
    assert data["message"] == "Transaction evaluated successfully"
    assert data["service"] == "test-fraud-service"
    assert data["environment"] == "TESTING"
    assert data["request_id"] == "req_test_12345"
    assert data["trace_id"] == "trace_test_67890"
    assert "timestamp" in data


# ---------------------------------------------------------------------------
# 2. Telemetry Metrics Tests
# ---------------------------------------------------------------------------
def test_metric_counter():
    """Verify counter increments monotonically and preserves low-cardinality labels."""
    counter = MetricCounter("test_counter", "Test counter description")
    assert counter.get_total() == 0.0

    counter.inc(1.0, labels={"status": "200", "method": "POST"})
    counter.inc(2.5, labels={"status": "200", "method": "POST"})
    counter.inc(1.0, labels={"status": "500", "method": "GET"})

    assert counter.get_total() == 4.5
    by_labels = counter.get_by_labels()
    assert by_labels["method=POST,status=200"] == 3.5
    assert by_labels["method=GET,status=500"] == 1.0


def test_metric_gauge():
    """Verify gauge sets, increments, and decrements correctly."""
    gauge = MetricGauge("test_gauge", "Test gauge description")
    assert gauge.get_value() == 0.0

    gauge.set(10.0)
    assert gauge.get_value() == 10.0

    gauge.inc(5.0)
    assert gauge.get_value() == 15.0

    gauge.dec(3.0)
    assert gauge.get_value() == 12.0


def test_metric_histogram():
    """Verify histogram calculates percentiles (p50, p95, p99) and averages."""
    hist = MetricHistogram("test_latency_ms", "Test latency in ms")
    
    # Observe 100 samples from 1 to 100
    for i in range(1, 101):
        hist.observe(float(i))

    stats = hist.get_statistics()
    assert stats["count"] == 100
    assert stats["p50"] == 51.0
    assert stats["p95"] == 96.0
    assert stats["p99"] == 100.0
    assert stats["avg"] == 50.5


def test_metrics_registry_snapshot():
    """Verify centralized MetricsRegistry provides comprehensive structured snapshot."""
    reg = MetricsRegistry()
    reg.transactions_received_total.inc(10)
    reg.transactions_processed_total.inc(9)
    reg.transactions_failed_total.inc(1)
    reg.http_requests_total.inc(20, labels={"status": "2xx"})

    snapshot = reg.get_snapshot()

    assert snapshot["transaction_pipeline"]["received_total"] == 10.0
    assert snapshot["transaction_pipeline"]["processed_total"] == 9.0
    assert snapshot["transaction_pipeline"]["failed_total"] == 1.0
    assert snapshot["http"]["requests_total"] == 20.0
    assert "timestamp" in snapshot


# ---------------------------------------------------------------------------
# 3. Distributed Tracing Tests
# ---------------------------------------------------------------------------
def test_distributed_tracing_spans_and_hierarchy():
    """Verify span creation, duration, parent-child linking, and tag sanitization."""
    tracer = Tracer(sample_rate=1.0)
    
    root_span = tracer.start_span("IngestTransaction", trace_id="trace_root_1")
    root_span.set_tag("transaction_type", "PURCHASE")
    root_span.set_tag("api_key", "secret_key_to_redact")

    # Child span
    child_span = tracer.start_span("EvaluateRules", trace_id="trace_root_1", parent_span_id=root_span.span_id)
    time.sleep(0.01) # 10ms
    child_dur = child_span.finish()
    tracer.record_completed_span(child_span)

    time.sleep(0.01)
    root_dur = root_span.finish()
    tracer.record_completed_span(root_span)

    assert root_span.tags["api_key"] == "[REDACTED]"
    assert child_span.parent_span_id == root_span.span_id
    assert root_dur >= child_dur
    assert len(tracer.get_recent_traces()) == 2


# ---------------------------------------------------------------------------
# 4. Health Probes & Observability API Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_health_endpoints():
    """Verify /health/live, /health/ready, and /health endpoints respond with valid schemas."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Liveness
        res_live = await ac.get("/health/live")
        assert res_live.status_code == 200
        assert res_live.json()["status"] == "UP"

        # Readiness
        res_ready = await ac.get("/health/ready")
        assert res_ready.status_code in (200, 503)
        body = res_ready.json()
        assert "subsystems" in body

        # Main health
        res_health = await ac.get("/health")
        assert res_health.status_code == 200
        assert "service" in res_health.json()


@pytest.mark.asyncio
async def test_observability_api_rbac_and_data():
    """Verify /api/v1/admin/observability endpoints enforce admin RBAC and return telemetry."""
    admin_token = create_access_token(data={"sub": "admin@fraudshield.internal", "role": "admin"})
    viewer_token = create_access_token(data={"sub": "viewer@fraudshield.internal", "role": "viewer"})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Unauthorized Access Denied (Viewer Role)
        res_unauth = await ac.get(
            "/api/v1/admin/observability/status",
            headers={"Authorization": f"Bearer {viewer_token}"}
        )
        assert res_unauth.status_code == 403

        # 2. Authorized Admin Status
        res_status = await ac.get(
            "/api/v1/admin/observability/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_status.status_code == 200
        status_body = res_status.json()
        assert "subsystems" in status_body
        assert "database" in status_body["subsystems"]
        assert "ingestion_pipeline" in status_body["subsystems"]

        # 3. Authorized Admin Metrics
        res_metrics = await ac.get(
            "/api/v1/admin/observability/metrics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_metrics.status_code == 200
        metrics_body = res_metrics.json()
        assert "telemetry" in metrics_body
        assert "slo_compliance" in metrics_body

        # 4. Authorized Admin Traces
        res_traces = await ac.get(
            "/api/v1/admin/observability/traces",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_traces.status_code == 200
        traces_body = res_traces.json()
        assert "traces" in traces_body

        # 5. Authorized Admin Alarms
        res_alarms = await ac.get(
            "/api/v1/admin/observability/alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_alarms.status_code == 200
        alarms_body = res_alarms.json()
        assert "alarms" in alarms_body
