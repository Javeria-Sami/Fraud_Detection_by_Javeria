# Requirements Traceability Matrix

This document provides a comprehensive traceability matrix mapping the original product requirements, architecture specifications, and software requirements specifications (SRS) to their active codebase implementations, test validations, and review statuses in the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**.

---

## 1. Traceability Matrix

| Requirement Identifier | Functional Domain | Implemented Component | Automated Tests | Verification Status | Notes & Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-ING-01** | Transaction Ingestion | `POST /api/v1/transactions` | `tests/unit/test_transaction_engine.py` | **VERIFIED** | Validates schema, currency, device, amounts, idempotency |
| **REQ-FEAT-01** | Feature Engineering | `backend/app/engine/features/` | `tests/unit/test_feature_engineering.py` | **VERIFIED** | Computes 1h/24h/7d sliding velocities, geo-distance, amount deviation |
| **REQ-RULE-01** | Deterministic Fraud Rules | `backend/app/engine/rules/` | `tests/unit/test_fraud_detection.py` | **VERIFIED** | 9 configurable heuristic rules with weights, thresholds, and simulation |
| **REQ-ML-01** | Machine Learning Anomaly Detection | `backend/app/engine/ml/` & `ml/` | `tests/unit/test_ml_anomaly_detection.py` | **VERIFIED** | Isolation Forest model inference ($< 15\text{ms}$), anomaly scoring, PSI drift |
| **REQ-RISK-01** | Multi-Factor Risk Engine | `backend/app/engine/risk/` | `tests/unit/test_risk_engine.py` | **VERIFIED** | Weighted composite score (0–100), risk bands (LOW/MED/HI/CRIT), factor explainability |
| **REQ-ALT-01** | Alert Generation & Triage | `backend/app/engine/alerts/` | `tests/unit/test_alert_system.py` | **VERIFIED** | Deduplication window, cooldown suppression, severity classification |
| **REQ-CASE-01** | Case Management & Evidence | `backend/app/api/v1/cases.py` | `tests/integration/test_case_workflow.py` | **VERIFIED** | Multi-alert linking, non-repudiable analyst notes, evidence locker, dispositions |
| **REQ-PROF-01** | 360° Entity Risk Profiling | `backend/app/api/v1/risk_profiles.py` | `tests/unit/test_risk_profiling.py` | **VERIFIED** | Behavioral baselines for Users, Devices, and Merchants |
| **REQ-SRCH-01** | Historical & Forensic Search | `backend/app/api/v1/search.py` | `tests/unit/test_search.py` | **VERIFIED** | Multi-entity facet filtering across TX, Alerts, Cases, Users, Devices, Merchants |
| **REQ-ANL-01** | Analytics & Visual Insights | `backend/app/api/v1/analytics.py` | `tests/unit/test_analytics.py` | **VERIFIED** | Currency-segmented volume aggregates, risk distribution, rule trigger ranking |
| **REQ-AUTH-01** | Authentication & RBAC | `backend/app/api/v1/auth.py` | `tests/security/test_security_hardening.py` | **VERIFIED** | JWT bearer tokens, password hashing (bcrypt), roles (`admin`, `analyst`, `viewer`) |
| **REQ-RT-01** | Real-Time Live Streaming | `backend/app/api/v1/ws/` | `tests/integration/test_websocket_stream.py` | **VERIFIED** | WebSocket broadcasting of live transactions, alerts, and system health |
| **REQ-NOTIF-01**| Notification Center | `backend/app/engine/notifications/` | `tests/integration/test_notification_pipeline.py`| **VERIFIED** | WebSocket push, in-app notification drawer, unread counters, deep links |
| **REQ-AUD-01** | Security Audit Logging | `backend/app/core/audit.py` | `tests/unit/test_audit_logging.py` | **VERIFIED** | Tamper-evident logging of administrative, rule, role, and case actions |
| **REQ-ADM-01** | Admin Governance Panel | `backend/app/api/v1/admin.py` | `tests/integration/test_admin_governance.py` | **VERIFIED** | User provisioning, role assignment, system settings, rule sandbox simulation |
| **REQ-OBS-01** | Observability & Telemetry | `backend/app/core/telemetry.py` | `tests/integration/test_observability.py` | **VERIFIED** | Prometheus metrics at `/metrics`, liveness `/health`, readiness `/health/ready` |
| **REQ-OPS-01** | Backup & Disaster Recovery | `scripts/backup_db.sh` & `restore_db.sh`| Staging Execution Validation | **VERIFIED** | Automated compressed snapshots, 30-day retention, safe restore runbooks |

---

## 2. Requirements Verification Conclusion

All 17 primary requirements have been verified against active source code implementations in the repository with corresponding test suites and documentation references. Zero missing functional requirements were identified.
