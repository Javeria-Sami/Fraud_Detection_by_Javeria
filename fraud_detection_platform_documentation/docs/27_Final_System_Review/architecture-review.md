# Architectural Review & Topology Audit

This document presents the architectural audit of the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**, verifying structural modularity, dependency boundaries, synchronous vs. asynchronous execution pipelines, and data flow topologies.

---

## 1. End-to-End Topology & Data Flow

```mermaid
flowchart TD
    subgraph INGRESS["Edge & Presentation Layer"]
        CLI[API Clients / Payment Gateways / SOC Browsers] --> PROXY[Nginx Reverse Proxy & TLS]
        PROXY --> SPA[React 18 / TypeScript SPA]
    end

    subgraph CORE_API["FastAPI Stateless Application Tier"]
        PROXY --> API[FastAPI Ingestion Gateway]
        API --> AUTH[JWT Authentication & RBAC Guard]
        AUTH --> PIPELINE[Transaction Evaluation Pipeline]
    end

    subgraph DETECTION_ENGINES["Evaluation Subsystems"]
        PIPELINE --> FEAT[Feature Store: Rolling Velocity & Baselines]
        FEAT --> RULES[Deterministic Fraud Rules Engine (9 Heuristics)]
        FEAT --> ML[ML Inference Engine (Isolation Forest)]
        RULES & ML --> RISK[Risk Fusion Engine (0–100 Weighted Score)]
        RISK --> ALERTS[Alert Engine (Deduplication & Cooldown)]
    end

    subgraph STATE_PERSISTENCE["State & Persistence Tier"]
        ALERTS --> DB[(PostgreSQL 16 Relational Storage)]
        PIPELINE --> REDIS[(Redis 7.2 Cache & Sliding Key Store)]
        ALERTS --> WS[WebSocket Event Broadcaster]
    end

    WS --> SPA
```

---

## 2. Component Boundary & Dependency Audit

| Subsystem | Upstream Dependencies | Downstream Dependencies | Coupling / Architecture Pattern |
| :--- | :--- | :--- | :--- |
| **Ingestion API** | Nginx Edge Proxy | Feature Engine, Database | Loose REST interface with strict Pydantic v2 schema validation |
| **Feature Engine** | Ingestion Payload | Redis (fast velocities), PostgreSQL (baselines) | In-memory non-blocking asynchronous feature extraction |
| **Rule Engine** | Feature Vector, Active Rules Cache | Risk Engine | Isolated rule evaluation classes; zero external I/O during evaluation |
| **ML Engine** | Normalized Feature Array, `.joblib` Artifact | Risk Engine | In-memory vectorized scikit-learn inference with heuristic fallback |
| **Risk Engine** | Rule Scores, ML Probability, Novelty Flags | Alert Engine, Database | Pure deterministic scoring formula with complete factor explainability |
| **Alert Engine** | Risk Score, Alert Rules | Database, WebSocket, Notification Engine | Idempotent generation with configurable cooldown and storm suppression |
| **WebSocket Engine** | Redis Pub/Sub, Authentication Token | Connected Browser Clients | Async connection manager with heartbeat and automatic client reconnection |

---

## 3. Anti-Pattern & Architecture Defect Audit

* **Circular Dependencies**: Zero circular imports detected across backend modules (`app.engine.*`, `app.api.*`, `app.core.*`).
* **Database Blocking I/O**: Verified all database interactions utilize asynchronous SQLAlchemy (`AsyncSession` + asyncpg) without synchronous blocking calls in async route loops.
* **Dead Code / Unused Infrastructure**: Clean module organization; all registered routers in `app/api/v1/api.py` are mapped to frontend pages and tests.
* **Architecture Verdict**: **PASSED (Production-Grade)**.
