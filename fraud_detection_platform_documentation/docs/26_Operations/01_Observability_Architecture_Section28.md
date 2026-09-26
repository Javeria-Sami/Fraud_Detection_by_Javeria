# Section 28 — Centralized Observability & Telemetry Architecture

## 1. Executive Summary

This document specifies the operational observability, telemetry, distributed tracing, structured logging, health checking, and Service Level Objective (SLO) monitoring architecture implemented in **Section 28** for the **Real-Time Fraud & Anomaly Detection Platform**.

Observability provides operators, security analysts, and engineers complete visibility into the health, performance, throughput, error rates, and internal latency breakdown of every platform subsystem without compromising security or leaking sensitive financial data.

---

## 2. The Three Pillars of Observability

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CENTRAL OBSERVABILITY                           │
├───────────────────┬────────────────────────────┬───────────────────────┤
│   1. LOGS         │   2. METRICS               │   3. TRACES           │
│   (What Happened) │   (Rates & Latencies)      │   (Where Time Was     │
│                   │                            │    Spent)             │
│ • Structured JSON │ • Counters, Gauges, Hists  │ • Distributed Spans   │
│ • Context Vars    │ • Strict Cardinality Guard │ • Parent-Child Tree   │
│ • Redaction Sanit.│ • SLI/SLO Target Tracker   │ • Auto Error Sampling │
└───────────────────┴────────────────────────────┴───────────────────────┘
```

---

## 3. Pillar 1: Structured JSON Logging & Data Redaction

### 3.1 Structured Log Format (`backend/app/core/logging.py`)
In production environments, all logs are outputted as single-line RFC-compliant JSON objects enriched with:
- `timestamp`: UTC ISO-8601 string.
- `level`: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`.
- `service`: System identifier (`Real-Time Fraud & Anomaly Detection Platform`).
- `module`: Python module origin.
- `request_id`: Active HTTP request correlation identifier.
- `trace_id`: Active distributed trace identifier.
- `span_id`: Active span identifier.
- `message`: Diagnostic human-readable explanation.
- `exception`: Formatted traceback (only in internal server logs, never exposed to clients).

### 3.2 Security-First Recursive Redaction
To prevent accidental leakage of sensitive credentials or payment data, `redact_sensitive_data()` automatically sanitizes:
- Keys matching: `password`, `secret`, `token`, `access_token`, `refresh_token`, `jwt`, `authorization`, `api_key`, `cvv`, `cvc`, `pin`, `card_number`, `pan`, `private_key`, `encryption_key`.
- Free-text strings containing 13–19 digit Payment Card Numbers (PANs).

---

## 4. Pillar 2: Operational Telemetry Metrics Registry

### 4.1 Metrics Registry (`backend/app/core/telemetry/metrics.py`)
The platform maintains an in-memory, thread-safe, and async-safe metrics collector comprising:
1. **HTTP Metrics**:
   - `http_requests_total`: Monotonic counter partitioned by low-cardinality status classes (`2xx`, `4xx`, `5xx`) and HTTP method.
   - `http_request_errors_total`: Count of 4xx and 5xx client/server errors.
   - `http_active_requests`: Real-time gauge of in-flight requests.
   - `http_request_duration_ms`: Sliding histogram providing `p50`, `p95`, `p99`, `avg`, `min`, `max`.
2. **Database Metrics**:
   - `db_queries_total`, `db_query_errors_total`, `db_connections_active`, `db_query_duration_ms`.
3. **Transaction Pipeline Metrics**:
   - `transactions_received_total`, `transactions_processed_total`, `transactions_failed_total`, `transactions_duplicate_total`, `transaction_pipeline_duration_ms`.
4. **Detection Pipeline Metrics**:
   - Features: `feature_computation_total`, `feature_computation_errors_total`, `feature_computation_duration_ms`.
   - Rules: `rule_evaluations_total`, `rule_triggered_total`, `rule_execution_errors_total`, `rule_execution_duration_ms`.
   - ML: `ml_predictions_total`, `ml_anomalies_total`, `ml_inference_errors_total`, `ml_inference_duration_ms`.
   - Risk: `risk_calculations_total`, `risk_calculation_errors_total`, `risk_calculation_duration_ms`.
   - Alerts: `alerts_evaluated_total`, `alerts_created_total`, `alert_deduplicated_total`, `alert_processing_errors_total`.
5. **Real-Time & WebSocket Metrics**:
   - `websocket_connections_active`, `websocket_connections_total`, `websocket_events_published_total`, `websocket_events_delivered_total`, `websocket_delivery_errors_total`.
6. **Background Workers & Notifications**:
   - `jobs_started_total`, `jobs_completed_total`, `jobs_failed_total`.
   - `notifications_queued_total`, `notifications_delivered_total`, `notifications_failed_total`.

### 4.2 Cardinality Control Guard
High-cardinality values such as `transaction_id`, `user_id`, `device_id`, `alert_id`, `case_id`, `request_id`, and `trace_id` are strictly prohibited from being used as metric dimensions. They are exclusively stored in sampled distributed traces and structured log context.

---

## 5. Pillar 3: Distributed Tracing & Sampling

### 5.1 In-Process Tracer (`backend/app/core/telemetry/tracer.py`)
- Manages parent-child span hierarchy with sub-millisecond precision.
- Binds `trace_id` and `span_id` across asynchronous context variables.
- Sampling Policy:
  - 100% of error spans (`status == "ERROR"`) are automatically sampled.
  - 100% of slow requests (`duration_ms > 500ms`) are automatically sampled.
  - Configurable probabilistic sampling (`TRACE_SAMPLE_RATE`, default 100% in development/SOC staging).

---

## 6. Health Check Subsystem

| Endpoint | Method | Purpose | Dependencies Checked |
| :--- | :---: | :--- | :--- |
| `/health/live` | `GET` | Process Liveness Probe | Process vitality (zero external dependencies) |
| `/health/ready` | `GET` | Subsystem Readiness Probe | Database connection, ML model artifact, WebSocket engine |
| `/health` | `GET` | Overall Status Summary | Database connectivity, active model version, service metadata |

---

## 7. Service Level Objectives (SLIs / SLOs)

| Metric | Service Level Indicator (SLI) | Target (SLO) | Operational Action on Breach |
| :--- | :--- | :---: | :--- |
| **API Availability** | Percentage of non-5xx responses | `≥ 99.9%` | Trigger Critical Alarm, alert on-call engineer |
| **API Latency (P95)** | P95 duration of standard requests | `≤ 500 ms` | Trigger Warning Alarm, inspect trace span bottlenecks |
| **Ingestion Success** | Percentage of valid transactions processed | `≥ 99.95%` | Trigger Critical Alarm, verify DB pool and queue depth |
| **ML Inference Availability**| Percentage of successful anomaly inferences | `≥ 99.5%` | Trigger Critical Alarm, verify memory-resident artifact |

---

## 8. Operational Diagnostics API & Frontend Dashboard

### 8.1 API Surface (`backend/app/api/v1/observability.py`)
- `GET /api/v1/admin/observability/status`: Protected live health status matrix across all 8 subsystems.
- `GET /api/v1/admin/observability/metrics`: Point-in-time telemetry snapshot and SLI/SLO indicators.
- `GET /api/v1/admin/observability/traces`: Sampled spans with duration and tag inspector.
- `GET /api/v1/admin/observability/alerts`: Live operational threshold alarms.

### 8.2 Frontend Dashboard (`frontend/src/pages/AdminObservability.tsx`)
- Available at route `/admin/observability` for administrators.
- Live 15-second telemetry polling and manual refresh.
- Subsystem health matrix, SLI/SLO compliance cards, sampled distributed trace drill-down, and active operational alarms feed.
