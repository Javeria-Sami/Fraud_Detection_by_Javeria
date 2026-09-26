# Analytics & Reporting Insights Guide

The **Analytics & Reporting** module delivers quantitative visual analytics, operational KPI aggregation, risk distribution modeling, and detection rule performance monitoring across historical financial transactions.

---

## 1. Accessing Analytics

1. Click **Analytics** in the sidebar navigation (Route: `/analytics`).
2. Use the **Date Range Selector** at the top right to adjust analysis windows (`Today`, `Last 7 Days`, `Last 30 Days`, `Last 90 Days`, or `Custom Range`).
3. Switch between analytical tabs:
   * **Overview & Volume**
   * **Risk & Anomaly Trends**
   * **Rule & Detection Performance**
   * **Geographic & Merchant Insights**

---

## 2. Key Performance Indicators (KPIs)

The top of the Analytics workspace displays aggregated metric cards:

| KPI Metric | Description |
| :--- | :--- |
| **Total Ingested Volume** | Total financial volume processed (grouped by currency to prevent inaccurate cross-currency summation). |
| **Total Transaction Count** | Number of transactions processed within the selected window. |
| **Average Risk Score** | Mean risk score across all evaluated transactions. |
| **High & Critical Flag Rate** | Percentage of transactions scoring $\ge 70$ (High/Critical risk bands). |
| **Alert Trigger Ratio** | Ratio of generated alerts to total transaction volume. |
| **Case Conversion Rate** | Percentage of alerts converted into formal investigation cases. |

---

## 3. Chart Visualizations & Interpretations

### 3.1 Transaction Volume & Risk Trends (Time Series)
* **Visual**: Dual-axis line and area chart plotting total transaction throughput against average hourly/daily risk scores.
* **Interpretation**: Spikes in transaction count accompanied by steep surges in average risk score typically indicate synchronized attack patterns (e.g., bot-driven credential stuffing or card-testing attacks).

### 3.2 Risk Score Band Distribution
* **Visual**: Donut chart and bar distribution categorizing transactions into configured score tiers:
  * `LOW` (< 30) — Green
  * `MEDIUM` (30–69) — Amber
  * `HIGH` (70–89) — Orange
  * `CRITICAL` (≥ 90) — Red
* **Interpretation**: Monitors the overall health of the transaction population. An unexpected expansion in `MEDIUM` or `HIGH` bands may warrant tuning detection thresholds or investigating a new fraud vector.

### 3.3 Rule Performance & Trigger Frequency
* **Visual**: Horizontal ranking of active detection rules sorted by total trigger count.
* **Interpretation**: Highlights the most frequently firing rules (e.g., `RULE_VELOCITY_1H`, `RULE_GEO_IMPOSSIBLE_TRAVEL`). Rules with unusually high trigger counts should be evaluated in Rule Administration to confirm they are not producing excessive false positives.

### 3.4 ML Anomaly Distribution vs. Rule Signals
* **Visual**: Scatter and correlation plot comparing Isolation Forest anomaly scores against rule-based heuristic scores.
* **Interpretation**: Visualizes overlap between deterministic rules and machine learning detections, identifying novel anomalies that slipped past traditional static rules.

---

## 4. Multi-Currency Financial Volumes

> [!NOTE]
> **Currency Grouping Standard**:
> Financial systems processing multiple currencies (e.g., USD, EUR, GBP) do not perform automatic synthetic currency conversions in historical reporting unless an explicit FX conversion pipeline is configured. Financial totals are displayed segmented by base currency code.

---

## 5. Exporting & Sharing Analytical Reports

* **Print / PDF Export**: Click the **Export Report** button to generate a clean, print-ready summary of all visible charts and KPI metrics.
* **CSV Aggregates**: Click **Download Data (CSV)** on individual chart cards to export aggregated time-series metrics for external executive briefing.
