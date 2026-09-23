# Main Security Dashboard (SOC Overview)

## 1. Overview & Architecture

The **Main Security Dashboard** serves as the central operational cockpit for financial security analysts, fraud officers, and system administrators. It combines real-time streaming event telemetry with historical database aggregations to provide immediate operational visibility into financial threat velocity, ML anomaly inferences, active alerts, and platform subsystem health.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Security Operations Center                    │
│   Dashboard Header: Time Range (15m/1h/6h/24h/7d) | ● Live Status     │
├────────────────────────────────────────────────────────────────────────┤
│ KPI ROW                                                                │
│ [ Total Txns ] [ High Risk ] [ Critical Risk ] [ Open Alerts ] [ Anom% ]│
├───────────────────────────────────────┬────────────────────────────────┤
│ Threat Velocity Trend (Time-series)   │ Risk Tier Distribution         │
│ Area Chart: Volume & Flagged Spikes   │ Donut Chart + Tier Meters      │
├───────────────────────────────────────┼────────────────────────────────┤
│ Live Security Activity Stream         │ Active Alert Triage Queue      │
│ Real-Time WebSocket Event Bus (max 50)│ Prioritized CRITICAL & HIGH    │
├───────────────────────────────────────┴────────────────────────────────┤
│ Recent Ingested Transactions (Responsive Table / Compact Cards)        │
├────────────────────────────────────────────────────────────────────────┤
│ Subsystem Operational Health Matrix (Ingestion, Rules, ML, Risk, Alert)│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Dashboard Widgets & Data Sources

| Widget Component | Data Source | Real-Time Sync | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **`DashboardHeader`** | WebSocket client state & system time | `useRealtime` state | Time range selector (`15m`, `1h`, `6h`, `24h`, `7d`), `● Live` connection pill, manual refresh trigger. |
| **`KPIGrid`** | `GET /api/v1/analytics/dashboard` | Incremented on events | Total volume, high-risk count, critical count, active alerts, ML anomaly rate (Isolation Forest). |
| **`ActivityTrendCard`** | `GET /api/v1/analytics/dashboard` | Refetched on range change | Multi-bucket time-series area chart (minute, 5-min, 30-min, 1-hour, or 1-day intervals). |
| **`RiskDistributionCard`**| `GET /api/v1/analytics/dashboard` | Dynamic tier increments | Donut visualization + progress meters for LOW, MEDIUM, HIGH, CRITICAL bands. |
| **`LiveActivityFeed`** | WebSocket event subscriptions | `transaction.created`, `alert.created`, `risk.calculated` | Bounded in-memory event stream (50 items max), reverse-chronological threat audit. |
| **`ActiveAlertsPanel`** | `GET /api/v1/analytics/dashboard` | `alert.created`, `alert.updated` | Prioritized triage queue with severity badges, risk scores, and alert reasons. |
| **`RecentTransactionsPanel`**| `GET /api/v1/analytics/dashboard` | `transaction.created` | Evaluated transactions with amounts, merchants, risk scores, and decision badges. |
| **`SystemStatusPanel`** | `GET /api/v1/analytics/dashboard` | REST health diagnostic | Status of Ingestion, Rule Engine, ML Engine, Risk Engine, Alert Engine, Database, WebSockets. |

---

## 3. Real-Time Event Integration & Reconciliation

- **WebSocket Transport**: Connected via `/ws/live` with JWT token handshake.
- **Event Dispatching**:
  - `transaction.created`: Ingests new transaction into recent queue, updates KPIs and risk tier distribution without requiring full page refetch.
  - `alert.created`: Appends to active alerts queue and increments active and critical alert counters.
  - `risk.calculated`: Dispatches risk score evaluation into live activity log.
  - `alert.updated`: Reconciles status across alert cards.
- **Data Protection & Privacy**: Sensitive card numbers, PINs, CVVs, and credentials are never exposed; User IDs and Merchant names are masked/cleanly formatted.

---

## 4. Responsive Layout & Accessibility

- **Desktop (>= 1024px)**: Multi-column information-dense grid with full tables, area charts, and side-by-side feeds.
- **Tablet (768px - 1023px)**: 2-column stacked KPI cards and responsive charts.
- **Mobile (< 768px)**: 1-column layout, table converts into compact transaction cards to prevent horizontal overflow, critical alerts emphasized at top.
- **Accessibility**: Keyboard navigable, visible focus rings, semantic HTML headings, screen-reader friendly status text, high contrast color coding.
