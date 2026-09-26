# Section 23: Centralized Security Audit Logging Subsystem

## 1. Overview & Architectural Principles

The **Audit Logging Subsystem** provides an authoritative, structured, cryptographically immutable, and tamper-resistant audit trail. It records every security-sensitive, administrative, operational, detection-lifecycle, and case-investigative event across the platform.

### Core Architectural Invariants:
1. **Who, What, When, Where & Outcome**: Every audit event captures:
   - **Actor**: `actor_user_id`, `actor_email`, `actor_role`, `actor_type` (`USER`, `ADMIN`, `SYSTEM`, `SCHEDULED_JOB`, `SERVICE`, `API`).
   - **Action**: Standardized action identifier from the centralized `AuditAction` registry.
   - **Resource / Target**: `resource_type` (e.g., `User`, `FraudRule`, `Alert`, `Case`, `MLModel`, `SystemSetting`) and `resource_id`.
   - **Outcome & Severity**: `outcome` (`SUCCESS`, `FAILURE`, `DENIED`, `PARTIAL`) and `severity` (`INFO`, `WARNING`, `HIGH`, `CRITICAL`).
   - **Request Context & Tracing**: `request_id`, `correlation_id`, `session_id`, `ip_address`, `user_agent`, `source` (`API`, `UI`, `BACKGROUND_WORKER`).
   - **State Diffs**: Sanitized before-and-after snapshots (`diff_old`, `diff_new`).
2. **Zero Sensitive Secret Leakage**: Passwords, hashes, tokens, API keys, webhook signing secrets, and payment card details (PAN, CVV, PIN) are automatically redacted with `••••••••••••` before serialization.
3. **Strict Immutability**: Audit records cannot be modified (`PUT`/`PATCH` rejected with HTTP 405) or deleted (`DELETE` rejected with HTTP 405).
4. **Fail-Safe Policy**: High-severity administrative mutations ensure audit consistency, while non-critical background telemetry errors fail gracefully without interrupting live transaction ingestion.

---

## 2. Standardized Audit Event Dictionary

| Domain | Standard Action | Default Severity | Target Resource | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication** | `LOGIN` | `INFO` | `User` / `Authentication` | Successful user authentication |
| **Authentication** | `LOGIN_FAILED` | `WARNING` | `User` / `Authentication` | Failed login attempt (bad credentials) |
| **Authentication** | `LOGOUT` | `INFO` | `User` | User session termination |
| **Authentication** | `TOKEN_REFRESH` | `INFO` | `User` | Access token rotation via refresh token |
| **Authentication** | `ACCOUNT_LOCKED` | `HIGH` | `User` | Account lockout after excessive failures |
| **Authorization** | `ACCESS_DENIED` | `WARNING` | `Security` | Unauthorized endpoint / resource access |
| **Authorization** | `PRIVILEGE_ESCALATION_BLOCKED` | `CRITICAL` | `Role` / `User` | Blocked unauthorized permission expansion |
| **User Admin** | `USER_CREATE` | `INFO` | `User` | Provisioning of new operator account |
| **User Admin** | `USER_STATUS_CHANGE` | `HIGH` | `User` | Activation or deactivation of account |
| **User Admin** | `USER_ROLE_CHANGE` | `HIGH` | `User` | Operator role assignment / tier modification |
| **User Admin** | `USER_DEACTIVATE_BLOCKED` | `CRITICAL` | `User` | Blocked deactivation of last administrator |
| **Settings** | `SETTING_UPDATE` | `INFO` | `SystemSetting` | Update to global risk bands or timeouts |
| **Detection** | `RULE_CREATE` / `RULE_UPDATE` | `INFO` | `FraudRule` | Compilation or modification of fraud rules |
| **Detection** | `RULE_VERSION_ACTIVATE` | `HIGH` | `FraudRuleVersion` | Production deployment of rule version |
| **Detection** | `RULE_VERSION_RETIRE` | `HIGH` | `FraudRuleVersion` | Safe retirement of rule version |
| **Detection** | `RULE_SIMULATION_EXECUTE` | `INFO` | `FraudRule` | Dry-run rule evaluation on synthetic data |
| **Detection** | `ALERT_CONFIG_UPDATE` | `HIGH` | `AlertConfiguration` | Tuning of alert thresholds and cooldowns |
| **Alerts** | `ALERT_ASSIGNED` / `ALERT_RESOLVED` | `INFO` | `Alert` | Analyst alert assignment or resolution |
| **Cases** | `CASE_CREATE` / `CASE_UPDATE` | `INFO` | `Case` | Case initialization or status progression |
| **Cases** | `CASE_NOTE_ADDED` / `CASE_EVIDENCE_ADDED` | `INFO` | `Case` | Investigative notes or evidence attachment |
| **Cases** | `CASE_RESOLVED` / `CASE_CLOSED` | `INFO` | `Case` | Conclusion of fraud investigation |
| **ML / MLOps** | `MODEL_REGISTERED` / `MODEL_EVALUATED` | `INFO` | `MLModel` | Candidate model evaluation in registry |
| **ML / MLOps** | `MODEL_DEPLOYED` | `CRITICAL` | `MLModel` | Production model deployment |
| **ML / MLOps** | `MODEL_RETRAINING_STARTED` | `INFO` | `ModelRetrainingRun` | Retraining pipeline trigger |
| **ML / MLOps** | `MODEL_RETRAINING_COMPLETED` | `INFO` | `ModelRetrainingRun` | Candidate model artifact serialization |

---

## 3. Database Schema & Indexing

The `audit_logs` table incorporates multi-column composite indexing for sub-millisecond query performance:
- `ix_audit_logs_timestamp_severity` (`timestamp`, `severity`)
- `ix_audit_logs_action_result` (`action`, `result`)
- `ix_audit_logs_entity_composite` (`entity_type`, `entity_id`)
- `ix_audit_logs_request_id` (`request_id`)
- `ix_audit_logs_actor_type` (`actor_type`)

---

## 4. REST API Endpoints

All endpoints require `ADMIN` or `ANALYST` role authorization (`require_roles(["admin", "analyst"])`):

- **`GET /api/v1/audit-logs`** / **`GET /api/v1/audit/logs`**:
  - Parameters: `query`, `action`, `resource_type`, `resource_id`, `actor_email`, `actor_type`, `severity`, `outcome`, `source`, `request_id`, `date_from`, `date_to`, `page`, `page_size`, `sort_by`, `sort_order`.
  - Returns paginated `AuditLogListResponse`.
- **`GET /api/v1/audit-logs/{audit_log_id}`**:
  - Returns complete `AuditLogResponse` with full state diffs and sanitized metadata.
- **`GET /api/v1/audit-logs/stats`**:
  - Returns live telemetry `AuditStatsResponse` (totals, today's counts, high-severity counts, action and outcome distributions).
