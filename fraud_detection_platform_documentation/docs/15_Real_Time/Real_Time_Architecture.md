# Section 11 — Real-Time Event System Specification & Architecture

## 1. Overview & Architecture

The **Real-Time Event System** provides a non-blocking, authenticated, and RBAC-governed event distribution pipeline. It broadcasts real-time security events (transactions, risk calculations, operational alerts, and system health status) from backend domain engines to connected frontend analysts and operator dashboards.

```
                  ┌──────────────────────┐
                  │    Domain Engines    │
                  │ (Txn / Risk / Alert) │
                  └──────────┬───────────┘
                             │
                             ▼ Persist to PostgreSQL
                  ┌──────────────────────┐
                  │   Event Publisher    │
                  │ (Sanitize & Envelope)│
                  └──────────┬───────────┘
                             │
                             ▼ EventEnvelope
                  ┌──────────────────────┐
                  │  Connection Manager  │
                  │  (RBAC & Topic Filter│
                  └──────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client WS 1 │     │  Client WS 2 │     │  Client WS 3 │
│   (Admin)    │     │  (Analyst)   │     │   (Viewer)   │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. Standardized Event Envelope

Every published event adheres to a strict, versioned `EventEnvelope` schema:

```json
{
  "event_id": "9f21f7a0-0d3f-4e08-bfb1-9c6258fa4922",
  "event_type": "alert.created",
  "schema_version": "1.0",
  "occurred_at": "2026-09-21T18:20:00.000Z",
  "source": "fraud_platform_backend",
  "entity_type": "alert",
  "entity_id": "ALT-9A3B4F21",
  "severity": "CRITICAL",
  "correlation_id": "corr-uuid",
  "payload": {
    "id": "ALT-9A3B4F21",
    "transaction_id": "TXN-10003",
    "user_id": "USR-CUST-1002",
    "severity": "CRITICAL",
    "risk_score": 94.0,
    "title": "Critical Risk Transaction Detected",
    "alert_reason": "Impossible Travel & Novel Device Crypto Outflow",
    "status": "NEW",
    "created_at": "2026-09-21T18:20:00.000Z"
  }
}
```

---

## 3. Supported Real-Time Event Types

| Event Type | Topic | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `transaction.created` | `transactions` | `transaction.read` | Broadcast when a new transaction is processed. |
| `transaction.updated` | `transactions` | `transaction.read` | Broadcast on status change (e.g. APPROVED $\rightarrow$ BLOCKED). |
| `risk.calculated` | `risk` | `transaction.read` | Multi-factor risk score and explainability factors. |
| `alert.created` | `alerts` | `alert.read` | Operational fraud alert created for triage. |
| `alert.updated` | `alerts` | `alert.read` | Alert status change (e.g. ACKNOWLEDGED, RESOLVED). |
| `system.status` | `system` | `analytics.read` | Platform operational health telemetry. |
| `system.heartbeat` | `system` | None (Connection-level) | Periodic ping/pong keepalive frame. |

---

## 4. Authentication & RBAC Handshake

1. **Query Param Authentication**:
   * Client initiates: `wss://<host>/ws/live?token=<jwt_access_token>`
   * Server validates token claims (`sub`, `role`, `permissions`).
2. **First-Frame JSON Handshake**:
   * Alternatively, client connects and transmits: `{"action": "auth", "token": "<jwt_access_token>"}`
3. **RBAC Filtering**:
   * `ADMIN` role receives full wildcard stream (`*`).
   * `ANALYST` role receives authorized `transactions`, `risk`, and `alerts` events.
   * `VIEWER` role receives read-only `transactions` and `system` telemetry.
   * Unauthorized events are filtered prior to socket transmission.

---

## 5. Delivery Semantics & Reliability

* **Delivery Model**: Best-effort, non-blocking real-time fan-out.
* **Database as Source of Truth**: Events are published only **after** database transactions are successfully committed to PostgreSQL / SQLite.
* **Failure Isolation**: A slow, stalled, or disconnecting client does not block or degrade event delivery to other active clients.

---

## 6. Client Reconnection & Heartbeat Protocol

* **Heartbeat**: Sent every `15s` (`{"action": "ping"}` $\rightarrow$ `{"event_type": "system.heartbeat", "status": "PONG"}`).
* **Exponential Backoff**:
  $$\text{Delay} = \min\left(15000\text{ms}, 1000\text{ms} \times 1.5^{\text{attempts}}\right) + \text{jitter}$$
* **Client Service**: Implemented in `frontend/src/services/realtime.ts` with React integration via `useRealtime` hook in `frontend/src/hooks/useRealtime.ts`.

---

## 7. Data Safety & Confidentiality

Event payloads are strictly sanitized:
* **Excluded Fields**: Passwords, password hashes, full PANs, CVVs, PINs, auth tokens, and session secrets are **never** included in broadcast payloads.
* **Minimal Payloads**: Only essential operational fields are transmitted over WebSockets; full forensic evidence is retrieved via authenticated REST APIs.
