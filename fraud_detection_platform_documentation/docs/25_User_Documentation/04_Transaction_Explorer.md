# 04 — Transaction Explorer & Forensic Inspection

## 1. Overview

The **Transaction Explorer** (`/transactions`) enables analysts to search, filter, sort, and inspect every financial transaction evaluated by the fraud detection pipeline.

---

## 2. Searching & Filtering

The explorer provides a rich search and filter toolbar:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [🔍 Search by User, Merchant, Device, or ID... ]  [All Risk Levels ▼]  │
│ [Status: All ▼]  [Date Range: Last 24 Hours ▼]   [Reset Filters]       │
└────────────────────────────────────────────────────────────────────────┘
```

- **Free-Text Search**: Supports exact Transaction ID (e.g. `TXN-A1B2C3D4`), User ID (`USR-1001`), Device ID, or Merchant Name.
- **Risk Level Filter**: Filter by `ALL`, `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
- **Status Filter**: Filter by `APPROVED`, `DECLINED`, `FLAGGED`, or `BLOCKED`.
- **Date Range Picker**: Bounded historical windows (1 Hour, 24 Hours, 7 Days, 30 Days, or Custom Range).
- **Server-Side Pagination**: Browse pages with configurable limits (20, 50, 100 per page) preventing browser memory degradation.

---

## 3. Transaction Detail Inspector

Clicking any row opens the **Transaction Detail View** (`/transactions/:id`):

```text
┌────────────────────────────────────────────────────────────────────────┐
│ TRANSACTION: TXN-9842104F                      Status: FLAGGED        │
│ User: USR-4091 (Sarah Jenkins)                 Time: 2026-09-26 21:10 │
├───────────────────────────────────┬────────────────────────────────────┤
│ 1. RISK ASSESSMENT                │ 2. RULE ENGINE SIGNALS             │
│ Score: 88.5 / 100 (HIGH)          │ • HIGH_AMOUNT (Points: 40)         │
│ ML Anomaly Score: 0.89            │ • RAPID_TRANSACTIONS (Points: 30)  │
│ Rule Points: 70.0                 │ • NEW_DEVICE (Points: 15)          │
├───────────────────────────────────┼────────────────────────────────────┤
│ 3. FEATURE SNAPSHOT               │ 4. LINKED ALERTS & CASES           │
│ • Velocity (5m): 6 txns           │ • Alert: ALT-4012 (CRITICAL)       │
│ • Amount Deviation: 7.2x avg      │ • Case: CASE-109 (In Progress)     │
│ • Geo Hop Speed: 1,200 km/h       │                                    │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Forensic Sections Explained:
1. **Risk Assessment Card**: Breaks down the score composition between deterministic rule points (weight: 50%), ML unsupervised anomaly score (weight: 35%), and user risk baseline (weight: 15%).
2. **Rule Signals Triggered**: Lists every active fraud rule evaluated against the transaction, showing points awarded, severity, and rule version.
3. **Feature Snapshot**: Preserves the exact temporal features extracted at the moment of authorization (e.g. velocity, deviation ratio, device novelty).
4. **Linked Alerts & Action Buttons**: Allows analysts to directly **Escalate to Case** or view existing related alerts.
