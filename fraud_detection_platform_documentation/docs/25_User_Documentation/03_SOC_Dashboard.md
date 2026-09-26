# 03 — SOC Dashboard & Real-Time Monitoring

## 1. Overview

The **SOC Dashboard** (`/`) is the central command interface for real-time threat visualization, operational KPI monitoring, and live transaction stream ingestion.

---

## 2. Key Performance Indicators (KPIs)

At the top of the dashboard, four real-time metric cards summarize platform activity:

```text
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ TOTAL TRANSACTIONS │ HIGH RISK DETECTED│ ACTIVE ALERTS   │ CRITICAL CASES  │
│     142,850     │      1,240      │       48        │        12       │
│  +12% vs last hr│   3.2% Anomaly  │  14 Unassigned  │ 4 Urgent Action │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

1. **Total Transactions**: Total financial transactions ingested during the selected time window.
2. **High-Risk Transactions**: Volume and percentage of transactions scoring $\ge 70$ on the hybrid risk engine.
3. **Active Alerts**: Unresolved alerts requiring triage by security analysts.
4. **Critical Cases**: Escalated investigation cases marked with high or critical severity.

---

## 3. Interactive Charts & Visualizations

### 3.1 Transaction Volume & Anomaly Trends
- A multi-series line chart tracking total ingestion velocity versus anomalous transaction spikes over 1-hour, 24-hour, and 7-day intervals.
- Spikes correlate with high-velocity attacks or unusual merchant-category spending patterns.

### 3.2 Risk Score Distribution
- A categorical breakdown displaying transaction density across the four standard risk bands:
  - **LOW (< 30)**: Green, nominal everyday consumer activity.
  - **MEDIUM (30–69)**: Blue/Yellow, minor deviation or first-time device.
  - **HIGH (70–89)**: Orange, multiple rule triggers or elevated ML anomaly score.
  - **CRITICAL (≥ 90)**: Red, severe velocity bursts, known fraud fingerprints, or geographical impossibilities.

---

## 4. Live Real-Time Transaction Stream

The bottom section displays the live ingestion feed connected via secure WebSockets (`/ws`):
- Every incoming transaction is dynamically appended with its calculated **Risk Score**, **User ID**, **Amount**, **Merchant**, and **Status Badge**.
- Clicking any transaction in the live feed opens the **Transaction Detail Modal** for immediate forensic inspection.
- The stream includes a **Pause / Resume Stream** toggle to freeze the list when inspecting rapid transaction bursts.
