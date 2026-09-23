# Section 10 — Alert Engine Architecture & Specification

## 1. Overview & Operational Role

The **Alert Engine** evaluates completed multi-factor **Risk Results** (Section 09) and transaction contexts against configurable fraud detection thresholds, behavioral patterns, and ML anomaly probabilities to determine whether an actionable operational alert must be created for security analysts.

```
                  ┌──────────────────────┐
                  │     Risk Engine      │
                  │     (Section 09)     │
                  └──────────┬───────────┘
                             │
                             ▼ Risk Result
                   (Score, Band, Factors)
                             │
┌────────────────────────────▼────────────────────────────┐
│                      ALERT ENGINE                       │
│                                                         │
│  1. Condition Evaluation (Thresholds, ML, Rules)        │
│  2. Alert Decision Formulation (Type, Severity, Prio)   │
│  3. Idempotent Deduplication (txn_id + alert_type)      │
│  4. Storm Suppression Cooldown (User-level throttling)  │
│  5. Critical Cooldown Bypass Override                   │
│  6. Lifecycle State Machine Enforcement                 │
│  7. Immutable Audit Trail Logging                       │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
                        Alert Record
               (Status: NEW, ACKNOWLEDGED...)
                             │
                             ▼
                 Section 11 (Real-Time Events)
```

---

## 2. Core Alert Types & Condition Rules

| Alert Type | Trigger Criteria | Default Severity | Priority | Description |
| :--- | :--- | :--- | :--- | :--- |
| **CRITICAL_RISK_TRANSACTION** | $\text{RiskScore} \ge 90.1$ or Critical Rule Fired | `CRITICAL` | `P1` | Severe fraud probability; immediate analyst triage required. |
| **HIGH_RISK_TRANSACTION** | $\text{RiskScore} \ge 70.1$ or High Severity Rule | `HIGH` | `P2` | Elevated composite risk score exceeding high threshold. |
| **ML_ANOMALY** | ML Anomaly Probability $\ge 85.0\%$ | `HIGH` | `P2` | Unsupervised Isolation Forest flagged anomalous vector. |
| **RAPID_TRANSACTION_ACTIVITY** | Short-term velocity surge detected | `MEDIUM` | `P3` | Uncharacteristic burst in transaction frequency. |
| **NEW_DEVICE_RISK** | Novel device/geo fingerprint detected | `MEDIUM` | `P3` | Authentication or payment from unfamiliar endpoint. |

---

## 3. Severity to Priority Mapping

Alert priority dictates investigator queue ordering:
* `CRITICAL` $\rightarrow$ **P1 (Urgent / Immediate Action)**
* `HIGH` $\rightarrow$ **P2 (High Priority)**
* `MEDIUM` $\rightarrow$ **P3 (Standard Triage)**
* `LOW` $\rightarrow$ **P4 (Informational / Low Priority)**

---

## 4. Deduplication & Storm Suppression Cooldown

1. **Transaction-Level Idempotency**:
   * Deduplication Key: `{transaction_id}:{alert_type}`
   * Guaranteed at both application service and database query levels. Re-evaluating the same transaction returns the existing alert record without duplicate key conflicts.
2. **User-Level Storm Suppression**:
   * If a user initiates multiple rapid transactions, standard alerts within `cooldown_seconds` (default: 300s / 5m) are throttled to prevent notification fatigue.
3. **Critical Override Guarantee**:
   * When `enable_critical_cooldown_override = True`, alerts with `CRITICAL` severity strictly bypass cooldown suppression, ensuring critical breach signals are never silenced.

---

## 5. Alert Lifecycle State Machine

The Alert Engine enforces a deterministic state transition graph:

```
          ┌─────────────┐
          │  NEW / OPEN │
          └──────┬──────┘
                 │
      ┌──────────┼───────────┬──────────────┐
      ▼          ▼           ▼              ▼
┌──────────┐ ┌─────────┐ ┌────────────┐ ┌───────────┐
│ACKNOWLEDGE│ │INVESTIG.│ │ ESCALATED  │ │ DISMISSED │
└─────┬────┘ └────┬────┘ └─────┬──────┘ └───────────┘
      │           │            │
      └───────────┼────────────┘
                  ▼
            ┌───────────┐
            │ RESOLVED  │
            └─────┬─────┘
                  ▼
            ┌───────────┐
            │  CLOSED   │
            └───────────┘
```

* Valid Transitions:
  * `NEW` / `OPEN` $\rightarrow$ `ACKNOWLEDGED`, `INVESTIGATING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `DISMISSED`, `ESCALATED`
  * `ACKNOWLEDGED` $\rightarrow$ `INVESTIGATING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `DISMISSED`, `ESCALATED`
  * `INVESTIGATING` / `IN_PROGRESS` $\rightarrow$ `RESOLVED`, `CLOSED`, `DISMISSED`, `ESCALATED`
  * `ESCALATED` $\rightarrow$ `INVESTIGATING`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `DISMISSED`
  * `RESOLVED` $\rightarrow$ `CLOSED`, `DISMISSED`
* Terminal States: `CLOSED`, `DISMISSED` (transitions to `NEW` or `OPEN` are strictly rejected).

---

## 6. Structured Explainability & Evidence Format

Every generated alert persists a detailed evidence payload:

```json
{
  "transaction_id": "TXN-10003",
  "risk_score": 94.0,
  "risk_level": "CRITICAL",
  "rule_score": 90.0,
  "ml_score": 88.0,
  "behavior_score": 40.0,
  "factors": [
    {
      "factor_name": "Novel Device Fingerprint",
      "code": "BEHAVIOR_NOVELTY",
      "weight": 0.4,
      "score": 40.0,
      "contribution": 16.0,
      "description": "Transaction initiated from unfamiliar endpoint.",
      "evidence": {"is_new_device": 1}
    }
  ],
  "transaction_amount": 85000.0,
  "currency": "USD",
  "merchant_name": "Binance Global Exchange",
  "user_id": "USR-CUST-1002"
}
```

---

## 7. Versioning & Configuration Protection

* Version Tag: `alert-v1.0.0`
* Alert thresholds, cooldown windows, and priority mappings are manageable via `GET /api/v1/alerts/config` and `PATCH /api/v1/alerts/config`.
* Configuration updates are guarded by `ADMIN` RBAC and logged into the immutable `audit_logs` table.
