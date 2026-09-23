# Complete Database Schema Reference

The database foundation for the **Real-Time Fraud & Anomaly Detection Platform** comprises 26 tables engineered with SQLAlchemy 2.0 and versioned via Alembic.

## 1. Identity & Access Management (IAM)
* **`roles`**: System roles (`ADMIN`, `ANALYST`, `VIEWER`).
* **`permissions`**: Fine-grained permissions (`transaction.read`, `alert.update`, `case.manage`, `rule.manage`, etc.).
* **`role_permissions`**: Many-to-many junction mapping roles to granular permission IDs.
* **`users`**: Platform users and customers with argon2/bcrypt-compatible `password_hash`, role foreign key, activation and verification flags.

## 2. Commerce & Entity Infrastructure
* **`merchants`**: Registered merchant profiles with unique `merchant_code`, category, risk level, and location metadata.
* **`devices`**: Device fingerprints, hardware OS, browser, IP address, and first/last activity timestamps.

## 3. Transaction Processing & Pipeline Telemetry
* **`transactions`**: High-throughput transaction ledger capturing financial attributes, geospatial data, device IDs, transaction status (`PENDING`, `COMPLETED`, `FAILED`, `DECLINED`, `REVERSED`, `CANCELLED`), risk level, and scores.
* **`feature_snapshots`**: Real-time extracted vector snapshot (velocity, amount deviation, geographical hop speed, etc.) persisted per transaction.

## 4. Deterministic Fraud Rules Domain
* **`fraud_rules`**: Rule definitions (`HIGH_AMOUNT`, `RAPID_TRANSACTIONS`, `NEW_DEVICE`, `UNUSUAL_LOCATION`, `UNUSUAL_TIME`, `FAILED_ATTEMPTS`, `SUDDEN_SPENDING_INCREASE`, `MERCHANT_ANOMALY`, `BEHAVIOR_DEVIATION`).
* **`fraud_rule_versions`**: Immutable versioning history storing JSON condition configurations, thresholds, and weights.
* **`rule_executions`**: Detailed execution results storing whether a rule triggered, score contribution, explanation reason, and execution latency.

## 5. Machine Learning & Risk Engine
* **`model_versions`**: ML model registry storing algorithm name, deployment status (`CANDIDATE`, `APPROVED`, `DEPLOYED`, `RETIRED`), hyperparameters, and performance metrics (Precision, Recall, ROC-AUC).
* **`ml_predictions`**: Inferred anomaly scores, confidence, predictions, and latency.
* **`risk_scores`**: Unified risk assessment (0–100 scale) with CheckConstraints, rule/ML/behavioral sub-scores, and explainability breakdown.

## 6. Alert & Case Management System
* **`alerts`**: High-priority security alerts with severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), status (`NEW`, `ACKNOWLEDGED`, `INVESTIGATING`, `RESOLVED`, `CLOSED`), and assignee foreign keys.
* **`cases`**: Formal investigation cases (`OPEN`, `INVESTIGATING`, `PENDING`, `RESOLVED`, `CLOSED`).
* **`case_alerts`**: Many-to-many junction between cases and associated alerts.
* **`case_transactions`**: Junction linking cases directly to relevant transactions.
* **`case_notes`**: Cryptographically attributable analyst case notes.
* **`case_evidence`**: Evidence attachments, payload JSON, and audit metadata.
* **`case_history`**: Immutable audit timeline of case state transitions and actions.

## 7. Entity 360 Risk Profiles
* **`user_risk_profiles`**: Historical baseline, average spending, standard deviations, known devices/locations, and active risk tier.
* **`device_risk_profiles`**: Aggregated anomaly metrics, blacklisting status, and associated accounts.
* **`merchant_risk_profiles`**: Transaction volume, chargeback/alert frequencies, and base risk classification.

## 8. Governance, Audit & System Settings
* **`audit_logs`**: Immutable ledger of administrative and analytical actions recording actor, entity, IP address, user-agent, correlation ID, and payload.
* **`system_settings`**: Key-value operational configuration storage with modification tracking.
