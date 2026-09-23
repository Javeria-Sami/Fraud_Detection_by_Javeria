# Alert Configuration & Calibration

## 1. Overview
The Alert Configuration module governs the behavioral thresholds, suppression policies, priority mappings, and deduplication logic of the real-time Alert Engine. Settings are stored dynamically in the platform's `system_settings` registry under key `ALERT_ENGINE_CONFIG`.

## 2. Configurable Engine Parameters

| Parameter | Type | Domain / Bounds | Description |
|---|---|---|---|
| `risk_threshold_low` | Integer | $0 \le x < \text{medium}$ | Minimum composite risk score to trigger Low-severity alert. |
| `risk_threshold_medium` | Integer | $\text{low} < x < \text{high}$ | Threshold for Medium-severity alert generation. |
| `risk_threshold_high` | Integer | $\text{medium} < x < \text{critical}$ | Threshold for High-severity operational alert. |
| `risk_threshold_critical`| Integer | $\text{high} < x \le 100$ | Threshold for immediate Critical security incident alert. |
| `anomaly_score_threshold`| Float | $0.0 \le x \le 1.0$ | ML anomaly probability threshold for ML Anomaly alert generation. |
| `cooldown_minutes` | Integer | $1 \le x \le 1440$ | Alert storm suppression window preventing alert flood on identical entities. |
| `dedup_window_minutes` | Integer | $1 \le x \le 1440$ | Deduplication time window based on composite fingerprint. |
| `auto_case_creation_threshold` | Integer | $0 \le x \le 100$ | Composite risk score at which an investigation case is automatically spawned. |
| `enabled_alert_types` | List[String] | Enum AlertType | Subset of enabled alert triggers (`RULE_TRIGGERED`, `HIGH_RISK_TRANSACTION`, `ML_ANOMALY_DETECTED`, `VELOCITY_SPIKE`, `LOCATION_HOP`, `FAILED_AUTH_BURST`, `DEVICE_SWITCH`, `COMPOUND_FRAUD`). |

## 3. Dynamic Runtime Reloading
- The Alert Engine evaluates configuration parameters on a per-request cached cycle with immediate database invalidation upon administrative updates.
- Updating alert thresholds immediately alters the trigger evaluation of subsequent incoming transactions without service interruption.

## 4. Administrative Security & Permissions
- **RBAC Enforcement**: Viewing alert configuration requires `alerts.config.read` / `admin:read` permissions; modifications strictly mandate `alerts.config.update` / `admin:write`.
- **Change Traceability**: Every configuration change is recorded in `audit_logs` with the delta of modified keys and the administrative user ID.
