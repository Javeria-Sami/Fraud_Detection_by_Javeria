# Centralized System Settings & Policy Registry

## 1. Overview

The System Settings module provides typed schema validation, min/max bounds checking, secret masking, and structured audit logging for global platform configuration.

---

## 2. Setting Categories & Definitions

| Category | Key | Type | Default | Bounds / Allowed Values | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GENERAL`** | `system_mode` | `enum` | `ACTIVE_DEFENSE` | `ACTIVE_DEFENSE`, `MONITOR_ONLY`, `SIMULATION_ONLY` | Engine defense operational mode |
| **`GENERAL`** | `app_name` | `string` | `FraudShield AI` | Non-empty string | Platform display brand name |
| **`GENERAL`** | `environment_name` | `enum` | `DEVELOPMENT` | `DEVELOPMENT`, `STAGING`, `PRODUCTION` | Runtime environment tier |
| **`TRANSACTION`** | `max_transaction_amount` | `float` | `100000.0` | `[100.0 .. 10000000.0]` | Single transaction ceiling in USD |
| **`TRANSACTION`** | `daily_velocity_threshold` | `integer` | `50` | `[1 .. 1000]` | Max 24-hr cardholder transaction count |
| **`TRANSACTION`** | `enforce_strict_currency_validation` | `boolean` | `true` | `true`, `false` | Reject unlisted currencies on ingestion |
| **`RISK`** | `risk_threshold_low` | `integer` | `30` | `[0 .. 50]` | Upper bound for LOW risk tier |
| **`RISK`** | `risk_threshold_medium` | `integer` | `70` | `[31 .. 85]` | Upper bound for MEDIUM risk tier |
| **`RISK`** | `risk_threshold_high` | `integer` | `90` | `[71 .. 95]` | Upper bound for HIGH risk tier |
| **`RISK`** | `auto_block_threshold` | `integer` | `95` | `[80 .. 100]` | Score cutoff triggering automatic block |
| **`DETECTION`** | `alert_cooldown_seconds` | `integer` | `300` | `[10 .. 3600]` | Alert storm suppression window |
| **`DETECTION`** | `enable_realtime_simulation` | `boolean` | `true` | `true`, `false` | Enable zero-side-effect rule simulation |
| **`ML`** | `ml_anomaly_threshold` | `float` | `0.65` | `[0.1 .. 1.0]` | ML anomaly detection alert cutoff |
| **`ML`** | `ml_drift_alert_threshold` | `float` | `0.15` | `[0.01 .. 0.5]` | PSI / KS drift alert threshold |
| **`SECURITY`** | `session_timeout_minutes` | `integer` | `60` | `[5 .. 1440]` | Inactivity session timeout |
| **`SECURITY`** | `max_failed_login_attempts` | `integer` | `5` | `[3 .. 20]` | Failed attempts before lockout |
| **`SECURITY`** | `audit_retention_days` | `integer` | `365` | `[30 .. 3650]` | Immutable audit log retention period |
| **`SECURITY`** | `webhook_signing_secret` | `string` | `••••••••••••` | Sensitive (Masked) | Outbound HMAC secret |

---

## 3. Secret Protection & Validation Flow

1. **Masking**: Sensitive settings (`is_sensitive: true`) return `"••••••••••••"` in API responses and audit diffs.
2. **Typed Validation**: When an update is submitted via `PUT /api/v1/admin/settings/{key}`:
   - Type conformity is verified (e.g. integer must parse to `int`).
   - Range bounds are checked (`min_value`, `max_value`). Out-of-bounds updates return `422 Unprocessable Entity` with a clear constraint violation message.
   - Enums are validated against `allowed_values`.
3. **Audit Logging**: Changes are committed with `SETTING_UPDATE` audit logs capturing the key, actor email, and justification reason.
