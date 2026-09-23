# Alert Lifecycle & State Transition Architecture

## Overview
Operational fraud alerts in the platform undergo strict state-machine validation to prevent invalid lifecycle progressions, ensure multi-analyst concurrency safety, and maintain a 100% immutable audit log of actions and findings.

---

## 1. Directed State Machine Graph

```
                   ┌──────────────┐
                   │     NEW      │
                   └──────┬───────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
     ┌──────────────┐            ┌──────────────┐
     │ ACKNOWLEDGED │            │  DISMISSED   │ (Terminal: False Positive)
     └──────┬───────┘            └──────────────┘
            │                           ▲
            ├───────────────────────────┤
            ▼                           │
     ┌──────────────┐            ┌──────┴───────┐
     │INVESTIGATING ├───────────►│  ESCALATED   │
     └──────┬───────┘            └──────┬───────┘
            │                           │
            └─────────────┬─────────────┘
                          ▼
                   ┌──────────────┐
                   │   RESOLVED   │
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │    CLOSED    │ (Terminal)
                   └──────────────┘
```

---

## 2. Supported Lifecycle Transitions & Validation Rules

| Source State | Permitted Destination States | Triggers & Preconditions |
| :--- | :--- | :--- |
| `NEW` / `OPEN` | `ACKNOWLEDGED`, `INVESTIGATING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `DISMISSED`, `ESCALATED` | Triage pickup or automated auto-escalation |
| `ACKNOWLEDGED` | `INVESTIGATING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `DISMISSED`, `ESCALATED` | Analyst begins deep evidence inspection |
| `INVESTIGATING` | `RESOLVED`, `CLOSED`, `DISMISSED`, `ESCALATED` | Finding recorded: Legitimate, Confirmed Fraud, or Escalation |
| `ESCALATED` | `INVESTIGATING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `DISMISSED` | Tier-2 senior analyst pickup or resolution |
| `RESOLVED` | `CLOSED`, `DISMISSED` | Settlement confirmation or archiving |
| `CLOSED` | *None* | Terminal state |
| `DISMISSED` | *None* | Terminal state (e.g. Benign False Positive) |

---

## 3. Optimistic Concurrency Control

To prevent silent overwrites when multiple analysts review the same incident concurrently:
1. State transition requests accept an optional `expected_status` parameter.
2. If the current database status does not match `expected_status`, the backend rejects the transaction with `409 Conflict` and the message:
   ```json
   {
     "detail": "This alert was updated by another user (current status is 'RESOLVED'). Refresh to view latest state."
   }
   ```
3. Analysts are prompted to refresh and review the most recent changes.

---

## 4. Audit Trail & Real-Time Sync

Every transition generates:
- An entry in `audit_logs` tracking `actor_email`, `actor_role`, `diff_old`, `diff_new`, and `details` (resolution notes).
- An immediate WebSocket event `alert.updated` broadcast to subscribed analysts.
