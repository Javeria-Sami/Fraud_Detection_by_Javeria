# Section 20: Model Monitoring & MLOps Architecture

## 1. Overview

The Model Monitoring & MLOps subsystem provides continuous, auditable, and mathematically rigorous observability into deployed anomaly-detection models (`MLModelRegistry`). It tracks prediction telemetry, feature & score drift, data quality guardrails, inference latency percentiles, and supervised ground-truth metrics when verified labels exist.

```
Transactions
     ↓
Feature Store (features-v1)
     ↓
ML Inference (Isolation Forest)
     ↓
ML Predictions Telemetry (Score & Latency)
     ↓
Model Monitoring Engine (ModelMonitoringService)
     ├── Data Quality Monitor (Missing, NaN, Inf, Out-of-bounds, Freshness)
     ├── Feature Drift Monitor (PSI, KS-Test, Categorical Divergence)
     ├── Prediction & Score Drift Monitor (Score PSI, Anomaly-rate shift)
     ├── Latency & Error Monitor (p50, p95, p99, Failure rate)
     ├── Ground-Truth Performance Monitor (Precision, Recall, F1, ROC-AUC)
     └── Health Evaluator (NORMAL, WARNING, CRITICAL, UNKNOWN)
     ↓
Database Persistence (Runs, Snapshots, Drift, Health)
     ↓
MLOps Dashboard (/models)
```

---

## 2. Statistical Drift Methodology

### Population Stability Index (PSI)
Used for continuous numerical features and prediction anomaly score distributions:
$$PSI = \sum_{i=1}^{k} (Actual_i - Expected_i) \times \ln\left(\frac{Actual_i}{Expected_i}\right)$$

* **PSI < 0.10**: `NORMAL` (No significant distribution shift)
* **0.10 ≤ PSI < 0.25**: `WARNING` (Moderate drift detected; warranting observation)
* **PSI ≥ 0.25**: `CRITICAL` (Significant drift detected; potential feature distribution shift)

### Kolmogorov-Smirnov (KS) Two-Sample Test
Used for sensitive non-parametric continuous feature distribution comparisons:
* Evaluates maximum divergence $D = \sup_x |F_{ref}(x) - F_{curr}(x)|$
* $p < 0.01$: `CRITICAL` drift
* $p < 0.05$: `WARNING` drift
* $p \ge 0.05$: `NORMAL`

### Categorical Jensen-Shannon / Frequency Divergence
Compares categorical distributions (e.g. `merchant_category`, `payment_method`, `channel`, `country`) across reference and active monitoring windows.

---

## 3. Data Quality & Version Compatibility Guardrails

1. **Missing Values**: Per-feature null rate tracking with configurable warning thresholds (default 5%).
2. **Numeric Integrity**: Automatic detection of `NaN`, `+Infinity`, `-Infinity`, and invalid conversions.
3. **Domain Constraints**: Out-of-bounds checking against configured physical feature bounds (`FEATURE_BOUNDS` such as amounts, velocity counts, and ratios).
4. **Data Freshness**: Continuous lag monitoring between real-time transaction ingestion and telemetry updates.
5. **Feature Store Compatibility**: Strict runtime validation between model expected feature store version (`feature_version`) and ingested features.

---

## 4. Ground-Truth Performance & Strict No-Fabrication Rule

* **No-Fabrication Guarantee**: Unsupervised anomaly detection operates in real-time without immediate ground-truth labels. If no verified case outcomes or dispute labels exist for the window, the system explicitly reports:
  $$\text{Ground-truth performance: Unavailable (Awaiting analyst resolution)}$$
* **Label Alignment**: When transactions are resolved via Case Management (`CONFIRMED_FRAUD` vs `FALSE_POSITIVE`), the engine aligns prediction timestamps with resolution timestamps to compute:
  * Precision, Recall, F1-Score
  * ROC-AUC and PR-AUC
  * Full Confusion Matrix ($TP, FP, TN, FN$)

---

## 5. Model Health States

| Health Status | Description | Action Required |
| :--- | :--- | :--- |
| **NORMAL** | All drift, latency, error, and quality metrics are within configured thresholds. | Continuous monitoring. |
| **WARNING** | Moderate drift (PSI ≥ 0.10) or p95 latency warning threshold exceeded. | Monitor trends; inspect features. |
| **CRITICAL** | Severe drift (PSI ≥ 0.25), schema incompatibility, or high failure rate. | Operational investigation. |
| **UNKNOWN** | Insufficient sample size (< `minimum_sample_size`, default 20) for reliable evaluation. | Accumulate additional traffic. |

---

## 6. REST API Reference

| Endpoint | Method | RBAC Permission | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/ml-monitoring/health` | GET | `ml_monitoring:read` | High-level model health and telemetry summary. |
| `/api/v1/ml-monitoring/models` | GET | `ml_monitoring:read` | List all registered models with monitoring health status. |
| `/api/v1/ml-monitoring/drift` | GET | `ml_monitoring:read` | Feature drift matrix with PSI, KS, and statistical comparisons. |
| `/api/v1/ml-monitoring/runs` | GET | `ml_monitoring:read` | Paginated historical monitoring run records. |
| `/api/v1/ml-monitoring/runs/{id}` | GET | `ml_monitoring:read` | Detailed snapshot of metrics and drift for a specific run. |
| `/api/v1/ml-monitoring/run` | POST | `ml_monitoring:run` | Trigger on-demand monitoring run with custom time windows. |
| `/api/v1/ml-monitoring/config` | GET | `ml_monitoring:read` | Retrieve MLOps monitoring thresholds. |
| `/api/v1/ml-monitoring/config` | PUT | `ml_monitoring:configure` | Update MLOps monitoring thresholds with audit logging. |

---

## 7. Operational Limitations & Scope Boundary

* **Monitoring Only**: Section 20 strictly monitors and alerts on model behavior. It does **not** automatically retrain, replace, promote, or alter model inference weights.
* **Non-Blocking Execution**: Monitoring calculations are decoupled from the real-time transaction scoring path to guarantee zero impact on sub-50ms transaction latency SLAs.
