# ML Model Settings & Retraining Policy Administration

## 1. Overview

The Admin Panel integrates model governance with Section 20 (Model Monitoring & Drift) and Section 21 (Model Retraining). It provides administrative oversight, inference threshold tuning, drift alert triggers, and retraining policy configuration without duplicating ML subsystems.

---

## 2. Integrated Model Capabilities

### A. Production Model Oversight
- **Deployed Version Inspection**: Displays active model version, algorithm type, and deployment timestamp in the Admin Overview.
- **Health Diagnostics**: Tracks inference latency and health status via `PlatformDiagnosticsService`.

### B. MLOps Drift & Anomaly Thresholds
- **`ml_anomaly_threshold`**: Calibrates the anomaly score boundary triggering fraud alerts (Default: `0.65`, Range: `[0.1 .. 1.0]`).
- **`ml_drift_alert_threshold`**: Sets the Population Stability Index (PSI) and Kolmogorov-Smirnov drift threshold that prompts model retraining evaluation (Default: `0.15`, Range: `[0.01 .. 0.5]`).

### C. Retraining Governance & Candidate Model Safety
- **Zero Automatic Promotion**: Candidate models trained via `/api/v1/ml-retraining/run` are registered in the registry as `EVALUATED` and never replace the active production model without explicit administrative verification and promotion.
- **Retraining Configuration**: Tuning split ratios (`train_ratio`, `val_ratio`, `test_ratio`), minimum sample constraints, and contamination settings via `/api/v1/ml-retraining/config`.
- **Direct Navigation**: Seamless link from Admin Overview and Sidebar directly to `/models` for deep monitoring and retraining controls.
