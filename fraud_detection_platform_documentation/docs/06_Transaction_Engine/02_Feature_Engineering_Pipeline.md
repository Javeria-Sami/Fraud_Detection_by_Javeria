# Feature Engineering Pipeline

## 1. Architecture Overview

The **Feature Engineering Pipeline** transforms raw transaction payloads into structured, explainable, and time-aware numerical/categorical features.

```text
Incoming Transaction (T)
            ↓
Historical Context Query (< T strictly)
            ↓
  ┌─────────────────────────┐
  │ Category Extractors     │
  │ • Amount & Baseline     │
  │ • Sliding Velocities    │
  │ • Device Novelty        │
  │ • Geographic Distance   │
  │ • Temporal & Cyclical   │
  │ • Merchant Context      │
  │ • Failed Attempts       │
  │ • Payment Methods       │
  └────────────┬────────────┘
               ↓
     Feature Validation
    (No NaN / No Infinity)
               ↓
      Feature Snapshot
    (Version: v1.0.0)
               ↓
Rule Engine & ML Engine Integration
```

---

## 2. Core Principles & Safeguards

### 2.1 Strict Data Leakage Protection
- When computing features for transaction $T$ occurring at timestamp $t$:
  - **Only** historical transactions strictly before $t$ (`transaction_timestamp < t` and `id != T.id`) are included in queries.
  - Future transactions $T_{future} > t$ are excluded from historical baselines, velocities, and distance calculations.

### 2.2 Cold-Start Handling
- When a user has 0 prior transactions:
  - `has_sufficient_history = 0`
  - `is_first_user_transaction = 1`
  - `user_transaction_count = 0`
  - `user_total_spend = 0.0`
  - `user_average_transaction_amount = user_baseline_amount` (from profile or fallback $100.0)
  - `distance_from_previous_location_km = 0.0`
  - `seconds_since_previous_transaction = -1.0` (indicates no prior event)
- No fake or manufactured history is generated.

### 2.3 Reproducibility & Versioning
- Every feature calculation is deterministic.
- All snapshots are stamped with `feature_version: "v1.0.0"`.

---

## 3. Endpoints

- `GET /api/v1/transactions/{transaction_id}/features`: Retrieve the persisted or on-demand feature snapshot for a transaction.
- `POST /api/v1/transactions/{transaction_id}/recompute-features`: Recompute and persist features for existing transactions.
