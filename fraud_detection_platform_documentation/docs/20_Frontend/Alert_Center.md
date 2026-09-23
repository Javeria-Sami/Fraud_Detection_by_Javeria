# Frontend: Alert Center & Investigation Workspace

## Overview
The Alert Center (`/alerts`) is the primary operations console for security analysts to monitor incoming threat detections, filter alerts across multidimensional criteria, perform deep investigation telemetry review, and manage the complete alert lifecycle.

---

## 1. UI Component Hierarchy

```
frontend/src/pages/Alerts.tsx (Main Alert Center Workspace)
│
├── AlertsHeader.tsx
│   ├── Page Title & Live WebSocket Status Badge
│   ├── Total Alert Count & Last Sync Timestamp
│   └── Manual Sync Trigger
│
├── AlertKPIs.tsx
│   ├── Open Alerts Counter (Filtered click trigger)
│   ├── Critical Severity Counter
│   ├── High Priority (P1/P2) Counter
│   ├── Unassigned Backlog Counter
│   └── Resolved Today Metrics
│
├── AlertFilterBar.tsx
│   ├── Debounced Search Input (Alert ID, Txn ID, User, Reason)
│   ├── Severity Dropdown (CRITICAL, HIGH, MEDIUM, LOW)
│   ├── Status Dropdown (NEW, ACKNOWLEDGED, INVESTIGATING, ESCALATED, RESOLVED, DISMISSED)
│   ├── Min / Max Risk Score Range (0–100)
│   ├── Date Range Filter (Start & End with 90-day interactive cap)
│   └── Active Filter Chips with individual remove and "Clear All"
│
├── AlertsTable.tsx
│   ├── Sortable Headers (created_at, severity, risk_score, status)
│   ├── Badges (Severity, Risk Score Gauge, Status Badge)
│   ├── Linked Transaction Explorer Nav
│   └── Mobile-Responsive Compact Alert Card Fallback
│
├── AlertsPagination.tsx
│   ├── Server-Side Pagination Controls (Page Size: 25, 50, 100)
│   └── Page Jump & Record Count ("Showing 1 to 25 of 148 alerts")
│
├── AlertDetailDrawer.tsx (Slide-Out Investigation Workspace)
│   ├── Tab 1: Overview & Audit Timestamps
│   ├── Tab 2: Rule Signals & Structured Evidence
│   ├── Tab 3: Risk Engine Synthesis & ML Anomaly Inference
│   ├── Tab 4: Linked Transaction Financial & Geolocation Data
│   └── Tab 5: Lifecycle Operations & State Transition History
│
└── AlertActionModal.tsx
    ├── Resolve Alert Dialog (with mandatory outcome selection & notes)
    ├── Dismiss Alert Dialog (False Positive tagging)
    ├── Escalate Alert Dialog (Tier-2 escalation notes)
    └── Assign Alert Dialog (Analyst ownership routing)
```

---

## 2. Real-Time Integration & Event Reconciliation

The Alert Center subscribes to real-time WebSocket topics:
* `alert.created`: Appends new detections to the active table and updates top KPI cards in real time.
* `alert.updated`: Reconciles status transitions and assignments across all open analyst screens without requiring full page refetches.

---

## 3. Dedicated Deep Link Route

In addition to the slide-out drawer on `/alerts?selected=ALT-XXXXXX`, a full-page deep-link route is provided at `/alerts/:id` (`AlertDetail.tsx`) for direct incident sharing and bookmarking.
