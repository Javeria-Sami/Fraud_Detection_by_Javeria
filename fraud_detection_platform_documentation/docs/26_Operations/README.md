# Section 26 — Operations & Maintenance Manual

Welcome to the **Operations & Maintenance** documentation suite for the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform** (FraudShield). This manual establishes the long-term operational framework for running, monitoring, maintaining, backing up, troubleshooting, securing, upgrading, and recovering the platform in staging and production environments.

---

## 1. System Architecture at Operational Level

```mermaid
flowchart TD
    subgraph INGRESS["Edge & Ingress Layer"]
        LB[Reverse Proxy / TLS Terminator (Nginx)]
    end

    subgraph APP["Application Tier"]
        FE[Frontend SPA (React / Vite)]
        BE[Backend API (FastAPI / Python 3.13)]
        WS[WebSocket Engine (/api/v1/ws/*)]
        ML[ML Inference Engine (Isolation Forest)]
        WK[Background Retraining & Alert Workers]
    end

    subgraph DATA["Persistence & State Layer"]
        PG[(PostgreSQL 16 / asyncpg)]
        RD[(Redis 7.2 Ingestion & State Cache)]
        MR[Model Artifact Registry (/ml/models)]
    end

    subgraph OBS["Observability & Telemetry"]
        PROM[Prometheus Scraper (/metrics)]
        GRAF[Grafana Dashboards]
        LOGS[Structured JSON Logging]
    end

    LB --> FE
    LB --> BE
    BE --> WS
    BE --> ML
    BE --> WK
    BE & WK --> PG
    BE & WS --> RD
    ML --> MR
    BE & WK & PG & RD --> PROM
    PROM --> GRAF
    BE & WK --> LOGS
```

---

## 2. Operational Lifecycle

```mermaid
flowchart LR
    MON[Monitor & Health] --> DET[Detect Anomaly / Alert]
    DET --> INV[Investigate Traces/Logs]
    INV --> RES[Respond & Contain]
    RES --> REC[Recover & Restore]
    REC --> VER[Verify & Smoke Test]
    VER --> DOC[Document Postmortem]
    DOC --> IMP[Continuous Improvement]
```

---

## 3. Operational Service Inventory

| Component | Operational Purpose | Criticality | Health Endpoint / Check | Primary Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Edge Proxy (Nginx)** | Reverse proxy, SSL/TLS termination, static SPA hosting, rate limiting | **CRITICAL** | `GET /health` | Backend API |
| **Backend API (FastAPI)** | REST API, transaction ingestion, rule scoring, risk engine, RBAC | **CRITICAL** | `GET /health`, `GET /health/ready` | PostgreSQL, Redis |
| **PostgreSQL 16** | Persistent relational storage (transactions, alerts, cases, audits, rules) | **CRITICAL** | `pg_isready -h localhost -p 5432` | Storage Volume |
| **Redis 7.2** | Sliding velocity cache, WebSocket pub/sub, rate limit buckets | **HIGH** | `redis-cli ping` | Memory |
| **ML Inference Engine** | Real-time Isolation Forest anomaly scoring ($< 15\text{ms}$) | **HIGH** | Model Health in `/api/v1/models/health` | Model Artifact Registry |
| **WebSocket Engine** | Real-time security event broadcasting to SOC analysts | **MEDIUM** | WebSocket handshake test | Backend, Redis |
| **Retraining Worker** | Background model training, validation, and drift calibration | **LOW** | Background task queue health | PostgreSQL, CPU/RAM |

---

## 4. Operations Documentation Navigation

1. [01_Operations_Overview.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/01_Operations_Overview.md): Architecture, environments, and escalation workflows.
2. [02_Daily_Operations.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/02_Daily_Operations.md): Daily checklists for SOC and infrastructure engineers.
3. [03_Health_Monitoring.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/03_Health_Monitoring.md): Liveness, readiness, Prometheus metrics, and alerting thresholds.
4. [04_Incident_Response.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/04_Incident_Response.md): SEV-1 through SEV-4 incident workflows, triage, and postmortems.
5. [05_Troubleshooting.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/05_Troubleshooting.md): General diagnostic workflows and root cause analysis techniques.
6. [06_Database_Maintenance.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/06_Database_Maintenance.md): PostgreSQL vacuum, index maintenance, connection pool tuning, and migrations.
7. [07_Backup_and_Restore.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/07_Backup_and_Restore.md): Automated snapshots, restore runbooks, and recovery point objectives.
8. [08_Security_Maintenance.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/08_Security_Maintenance.md): Secret rotation, SSL certificate renewal, audit inspection, and vulnerability patching.
9. [09_Model_Operations.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/09_Model_Operations.md): ML model lifecycle, drift monitoring (PSI), retraining pipelines, and fallback handling.
10. [10_Performance_Maintenance.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/10_Performance_Maintenance.md): Capacity planning, bottleneck resolution, and latency tuning.
11. [11_Log_and_Metric_Management.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/11_Log_and_Metric_Management.md): Structured logging, retention policies, and Prometheus metric exporters.
12. [12_Release_and_Update_Operations.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/12_Release_and_Update_Operations.md): Blue-green deployments, migration execution, and rollback strategies.
13. [13_Scaling.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/13_Scaling.md): Horizontal and vertical scaling guidelines for API, worker, and database tiers.
14. [14_Disaster_Recovery.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/14_Disaster_Recovery.md): High-impact catastrophe recovery scenarios, RTO/RPO definitions, and DR drills.
15. [15_Operational_Checklists.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/15_Operational_Checklists.md): Daily, weekly, monthly, and release operational checklists.
16. [16_Operational_Runbook.md](file:///c:/Users/LENOVO/Documents/GitHub/Fraud_Detection_by_Javeria/fraud_detection_platform_documentation/docs/26_Operations/16_Operational_Runbook.md): Step-by-step emergency runbooks for all critical failure scenarios.

---

## 5. Distinction of Operational Status

To maintain factual integrity, all operational procedures in this manual distinguish between:
* **IMPLEMENTED**: Code, scripts, or configurations built into the repository.
* **DOCUMENTED**: Standard operating procedures established in this manual.
* **TESTED**: Procedures validated through automated test suites or verified staging runs.
