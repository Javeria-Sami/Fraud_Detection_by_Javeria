# Audit Logging Subsystem Test Strategy

## Test Suite: `tests/test_audit_logging.py`

### Test Scenarios:
1. **`test_sanitize_audit_data`**: Verifies recursive redaction of sensitive credentials, API keys, passwords, webhook secrets, tokens, and payment card numbers into `••••••••••••`.
2. **`test_audit_list_search_and_filtering`**: Validates search querying across action, actor, resource ID, and details, severity filtering (`INFO`, `WARNING`, `HIGH`, `CRITICAL`), outcome filtering (`SUCCESS`, `FAILURE`, `DENIED`), and server-side pagination.
3. **`test_audit_stats_endpoint`**: Verifies live telemetry metrics calculation (`total_events`, `events_today`, `high_critical_count`, `failed_denied_count`, `action_breakdown`).
4. **`test_audit_detail_and_not_found`**: Tests retrieval of structured event detail with state diffs and 404 behavior for invalid IDs.
5. **`test_audit_immutability_guarantees`**: Ensures that `PUT`, `PATCH`, and `DELETE` requests against audit records are rejected with HTTP 405 Method Not Allowed to guarantee cryptographic immutability.
6. **`test_audit_rbac_boundaries`**: Verifies that unprivileged roles (e.g., `VIEWER`) and unauthenticated requests receive HTTP 403 Forbidden / 401 Unauthorized.
