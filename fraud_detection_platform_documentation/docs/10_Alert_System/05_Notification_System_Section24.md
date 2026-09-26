# Section 24 — Centralized Notification System Specification & Architecture

## 1. Overview & Separation of Concerns

The **Notification System** (Section 24) communicates actionable events across the Fraud & Anomaly Detection Platform to authenticated users and external channels. It operates with strict architectural separation:

```text
Operational Fraud Event (Transaction / Alert Engine)
                  ↓
       Event Bus (Section 11)
                  ↓
   Notification Policy Service (Section 24)
                  ↓
   [Recipient Resolution & Preferences]
                  ↓
      [Deterministic Deduplication & Cooldown]
                  ↓
      [Persistence (notifications table)]
                  ↓
   Pluggable Delivery Channels (In-App / Email / Webhook)
                  ↓
 Real-Time WebSocket Fan-out & Delivery Audit Trail
```

---

## 2. Notification Event Dictionary

| Notification Type | Source Event | Recipients | Severity | Priority | Channels | Preference Category | Deduplication & Cooldown |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `CRITICAL_RISK_ALERT` | `alert.created` (Critical) | Assigned Analyst / All Admins & Analysts | `CRITICAL` | `URGENT` | `IN_APP`, `EMAIL` | `SECURITY_ALERTS` | 60s cooldown (Critical override) |
| `HIGH_RISK_ALERT` | `alert.created` (High) | Assigned Analyst / Analysts | `HIGH` | `HIGH` | `IN_APP`, `EMAIL` | `SECURITY_ALERTS` | 60s cooldown |
| `SECURITY_ALERT` | `alert.created` (Medium/Low) | Assigned Analyst / Analysts | `WARNING` / `INFO` | `NORMAL` / `LOW` | `IN_APP`, `EMAIL` | `SECURITY_ALERTS` | 60s cooldown |
| `ALERT_ASSIGNED` | `alert.assigned` | Assigned User | `INFO` | `NORMAL` | `IN_APP` | `SECURITY_ALERTS` | Recipient-keyed dedup |
| `ALERT_RESOLVED` | `alert.resolved` | Assigned User / Admins | `INFO` | `LOW` | `IN_APP` | `SECURITY_ALERTS` | Recipient-keyed dedup |
| `CASE_ASSIGNED` | `case.assigned` | Assigned Analyst | `INFO` | `NORMAL` | `IN_APP` | `CASE_UPDATES` | Recipient-keyed dedup |
| `CASE_ESCALATED` | `case.escalated` | Assigned Analyst & Admins | `HIGH` | `HIGH` | `IN_APP`, `EMAIL` | `CASE_UPDATES` | 60s cooldown |
| `CASE_RESOLVED` | `case.resolved` | Assignee & Admins | `INFO` | `LOW` | `IN_APP` | `CASE_UPDATES` | Recipient-keyed dedup |
| `MODEL_HEALTH_CRITICAL` | `model.health_critical` | Admins | `CRITICAL` | `URGENT` | `IN_APP`, `EMAIL` | `MODEL_MONITORING` | 60s cooldown |
| `MODEL_HEALTH_WARNING` | `model.health_warning` | Admins | `WARNING` | `NORMAL` | `IN_APP`, `EMAIL` | `MODEL_MONITORING` | 60s cooldown |
| `MODEL_RETRAINING_COMPLETED` | `model.retraining_completed` | Admins | `INFO` | `NORMAL` | `IN_APP` | `MODEL_MONITORING` | Recipient-keyed dedup |
| `MODEL_RETRAINING_FAILED` | `model.retraining_failed` | Admins | `HIGH` | `HIGH` | `IN_APP`, `EMAIL` | `MODEL_MONITORING` | Recipient-keyed dedup |
| `ADMIN_ACTION_REQUIRES_ATTENTION` | `admin.action` | Admins | `WARNING` | `NORMAL` | `IN_APP` | `ADMIN_SYSTEM` | Recipient-keyed dedup |

---

## 3. Pluggable Delivery Channels

1. **`InAppNotificationChannel`**: Persisted directly to `notifications` database table and pushed in real-time over WebSocket connection to active analyst browser sessions.
2. **`EmailNotificationChannel`**: Dispatches alert summaries using standard SMTP formatting and sanitized templates.
3. **`WebhookNotificationChannel`**: Outbound HTTP webhooks equipped with URL schema validation and SSRF protection (loopback/private IP blocking).

---

## 4. REST API Reference

- `GET /api/v1/notifications`: Paginated user notifications with filtering (`unread_only`, `category`, `severity`, `priority`, `search`).
- `GET /api/v1/notifications/unread-count`: Aggregate metric response for notification bell badge.
- `GET /api/v1/notifications/{notification_id}`: Single notification retrieval with strict IDOR user ownership checks.
- `PATCH /api/v1/notifications/{notification_id}/read`: Mark single notification as read.
- `POST /api/v1/notifications/read-all`: Mark all unread notifications as read.
- `PATCH /api/v1/notifications/{notification_id}/dismiss`: Dismiss notification from user feed.
- `GET /api/v1/notifications/preferences`: Get current user delivery channel preferences.
- `PUT /api/v1/notifications/preferences`: Update preferences with mandatory security policy enforcement.
- `GET /api/v1/notifications/admin/config`: Administrator policy & cooldown inspection.
- `PUT /api/v1/notifications/admin/config`: Administrator policy update with audit logging.

---

## 5. Security & IDOR Protection

- **Authorization Isolation**: User notifications can only be accessed or modified by the authenticated user whose `sub` matches `recipient_user_id`. Attempting to access another user's notification returns `404 Not Found`.
- **Mandatory Policy Guarantees**: Critical security alerts cannot be disabled in-app. The backend is authoritative and rejects preference mutations that attempt to suppress mandatory security notifications.
- **XSS & Content Sanitization**: All inbound notification titles and messages undergo automatic HTML stripping and escaping via `sanitize_text()`.
- **SSRF Defense**: Outbound webhook destinations disallow localhost, loopback addresses (`127.0.0.1`, `::1`), private RFC1918 subnets, and cloud metadata endpoints (`169.254.169.254`).
