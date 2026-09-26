# Audit Logs API Specification

## Endpoints

### 1. List Audit Logs
- **Route**: `GET /api/v1/audit-logs`
- **Security**: Bearer JWT (`ADMIN`, `ANALYST`)
- **Query Parameters**:
  - `query` (string, optional): Full-text search across action, actor, resource ID, details, request ID.
  - `action` (string, optional): Exact action filter (e.g. `RULE_UPDATE`, `LOGIN_FAILED`).
  - `resource_type` (string, optional): Target entity type (`User`, `FraudRule`, `Alert`, `Case`, `MLModel`, `SystemSetting`).
  - `resource_id` (string, optional): Specific resource identifier.
  - `severity` (string, optional): `INFO`, `WARNING`, `HIGH`, `CRITICAL`.
  - `outcome` (string, optional): `SUCCESS`, `FAILURE`, `DENIED`, `PARTIAL`.
  - `date_from` (ISO datetime, optional): Start timestamp.
  - `date_to` (ISO datetime, optional): End timestamp.
  - `page` (integer, default `1`): 1-indexed page.
  - `page_size` (integer, default `25`, max `200`): Items per page.
  - `sort_by` (string, default `timestamp`): `timestamp`, `action`, `severity`, `outcome`.
  - `sort_order` (string, default `desc`): `desc`, `asc`.
- **Response**: `AuditLogListResponse` (`total`, `page`, `page_size`, `total_pages`, `items`).

### 2. Get Audit Log Detail
- **Route**: `GET /api/v1/audit-logs/{audit_log_id}`
- **Security**: Bearer JWT (`ADMIN`, `ANALYST`)
- **Response**: `AuditLogResponse` (includes `diff_old`, `diff_new`, `metadata`, `ip_address`, `request_id`, `details`, `error_message`).

### 3. Get Audit Statistics
- **Route**: `GET /api/v1/audit-logs/stats`
- **Security**: Bearer JWT (`ADMIN`, `ANALYST`)
- **Response**: `AuditStatsResponse` (`total_events`, `events_today`, `high_critical_count`, `failed_denied_count`, `admin_actions_count`, `action_breakdown`, `severity_breakdown`, `outcome_breakdown`).
