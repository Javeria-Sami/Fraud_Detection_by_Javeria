# Frontend: Transaction Explorer & Investigation UI

## Overview
The Transaction Explorer provides a high-density, real-time investigation interface for reviewing transactions, evaluating risk factors, examining triggered fraud rules, and inspecting ML anomaly scores.

---

## 1. Component Architecture

```
frontend/src/pages/Transactions.tsx (Main Explorer Page)
│
├── TransactionFilterBar.tsx
│   ├── Debounced Search Input (transaction_id, user_id, merchant_id, device_id)
│   ├── Date Range Picker (ISO date validation)
│   ├── Risk Tier Selector (LOW, MEDIUM, HIGH, CRITICAL)
│   ├── Status Selector (PENDING, COMPLETED, FAILED, DECLINED, etc.)
│   ├── Amount Range (Min / Max)
│   └── Active Filter Chips with individual remove & "Clear All"
│
├── TransactionResultsTable.tsx
│   ├── Column-based sorting (Timestamp, Amount, Risk Score, Status)
│   ├── Visual Risk Score Badges (Color-coded 0–100 scale)
│   ├── Card/List fallback for mobile responsive viewports
│   └── "Inspect" Action trigger
│
├── TransactionPagination.tsx
│   ├── Record count & range display ("Showing 1 to 25 of 120 results")
│   ├── Page Size Dropdown (25, 50, 100)
│   └── Page Jump & Chevron Navigation
│
└── TransactionDetailDrawer.tsx (Slide-Out Investigation Drawer)
    ├── Overview & Risk Scoring (Risk score gauge, band, structured rationale)
    ├── Rule Signals Tab (Triggered rules, severity, evidence breakdown)
    ├── ML Anomaly Tab (Isolation Forest score, threshold, contextual indicators)
    ├── Feature Store Tab (Velocity, historical ratios, device fingerprints)
    └── Security Alerts Tab (Linked alerts with severity and status)
```

---

## 2. State Management & URL Synchronization

1. **URL-driven State:**
   * Explorer filter state is persisted in URL search parameters (`?search=TX-&risk_level=HIGH&page=1&selected=TX-1234`).
   * Deep links allow analysts to share direct transaction investigation links.
   * Browser Back/Forward navigation functions seamlessly without losing filter criteria.

2. **TanStack React Query:**
   * Query keys: `['transactions', { search, risk_level, status, page, page_size, sort_by, sort_order }]` and `['transaction-investigate', selectedTxId]`.
   * Stale time: 30 seconds with automatic background refresh.

---

## 3. Real-Time Reconciliation (WebSocket Integration)

When an analyst is viewing the explorer or inspecting a specific transaction:
* On `transaction.created`: Invalidate transactions query cache so new transactions appear dynamically.
* On `risk.calculated`: If the updated transaction matches `selectedTxId`, query cache `['transaction-investigate', txId]` is automatically invalidated and refreshed.
* On `alert.created`: Detail drawer alert count and list refresh immediately.

---

## 4. Standalone Detail Route

In addition to the slide-out drawer, a dedicated deep-link route is available at `/transactions/:id` (`TransactionDetail.tsx`) with full screen layout, tabbed telemetry, and back button navigation.
