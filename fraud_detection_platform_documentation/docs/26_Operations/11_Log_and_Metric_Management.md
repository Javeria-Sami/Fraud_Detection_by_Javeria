# Log & Metric Management Operations

This document establishes structured logging conventions, log retention policies, metric collection architectures, and privacy redaction rules for the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**.

---

## 1. Structured Logging Standards

All platform components produce structured JSON logs formatted with contextual metadata for automated ingestion into log aggregation pipelines (e.g., Elasticsearch, Loki, CloudWatch).

### Standard JSON Log Schema
```json
{
  "timestamp": "2026-09-26T22:00:15.123Z",
  "level": "INFO",
  "logger": "fraudshield.detection.risk_engine",
  "request_id": "req_a1b2c3d4e5f6",
  "user_id": "usr_98124",
  "transaction_id": "tx_77218",
  "event": "transaction_scored",
  "risk_score": 82.5,
  "risk_band": "HIGH",
  "ml_anomaly_score": 0.88,
  "latency_ms": 14.2,
  "environment": "production"
}
```

---

## 2. Log Levels & Usage Policy

| Level | When to Use | Retention Policy |
| :--- | :--- | :--- |
| `DEBUG` | Verbose feature dumps and local developer debugging (Disabled in production) | 3 Days (Staging only) |
| `INFO` | Standard transaction scoring milestones, user logins, rule updates, case closures | 30 Days (Hot) / 365 Days (Cold Archive) |
| `WARN` | Retries, degraded fallbacks, moderate drift warnings (PSI $\ge 0.10$) | 90 Days |
| `ERROR` | Failed inferences, database query exceptions, WebSocket drops | 180 Days |
| `CRITICAL` | Database disconnections, panic restarts, security breach attempts | Indefinite (Forensic / Compliance) |

---

## 3. Sensitive Data Redaction Policy

To uphold privacy and data security standards, sensitive payment and personal attributes are automatically masked before logging:

* **Primary Account Numbers (PAN)**: Masked to last 4 digits (`************1234`).
* **Passwords & JWT Secrets**: Replaced with `[REDACTED]`.
* **CVV / Security Codes**: Completely dropped from log payloads.
* **Personally Identifiable Information (PII)**: Full name and email address hashed or truncated.

---

## 4. Metric Collection & Prometheus Exporters

Metrics are exposed via the `/metrics` endpoint and scraped at 15-second intervals:

```mermaid
flowchart LR
    APP[FastAPI / Prometheus Client] -->|GET /metrics (15s)| PROM[Prometheus Server]
    PROM -->|Store TSDB (15-Day Retention)| TSDB[(Prometheus TSDB)]
    PROM -->|Query & Visualize| GRAF[Grafana Dashboards]
    PROM -->|Trigger Alerts| AM[Alertmanager (Slack / PagerDuty)]
```

### Key Operational Dashboards
* **Platform Overview**: Request rate, error rate, end-to-end latency, CPU/memory usage.
* **Fraud Ingestion Telemetry**: Ingestion rate, risk score distributions, triggered rule breakdown.
* **ML Drift & Health**: Anomaly rate, inference duration, PSI feature drift curves.
* **Infrastructure Health**: PostgreSQL active pool, Redis memory, Nginx connection count.
