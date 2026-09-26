# Notification Center Guide

The **Notification Center** keeps security analysts and administrators informed in real-time about critical system events, high-priority fraud alerts, case assignments, model drift warnings, and system health changes across the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**.

---

## 1. Accessing Notifications

Users can access notifications through two primary UI components:

1. **Top Navigation Bell Icon**:
   * Displays a real-time badge with the count of unread notifications.
   * Clicking the bell opens a quick-view dropdown drawer showing the latest 10 notifications with one-click deep links.
2. **Dedicated Notification Hub** (Route: `/notifications`):
   * Accessible via the sidebar or by clicking *View All Notifications* in the dropdown.
   * Provides full search, filtering by severity and category, bulk read/unread marking, and historical notification logs.

```mermaid
flowchart TD
    EV[Platform Events (Alerts, Cases, Retraining, Drift)] --> NS[Notification Engine]
    NS --> WS[WebSocket Live Push]
    NS --> DB[(Notification Store)]
    WS --> BELL[Top Nav Bell & Badge Count]
    WS --> TOAST[Real-Time Toast Popup]
    DB --> HUB[Notification Center Hub /notifications]
```

---

## 2. Notification Categories & Severities

Notifications are classified into operational categories:

| Category | Description | Typical Triggers |
| :--- | :--- | :--- |
| **SECURITY_ALERT** | New high or critical fraud alert generated | Transaction risk score $\ge 70$, high-velocity anomaly |
| **CASE_UPDATE** | Investigation case workflow updates | Case assigned to you, status changed, new comment/evidence |
| **ML_HEALTH** | Machine learning drift and retraining alerts | Population Stability Index (PSI) $> 0.25$, retraining completed |
| **SYSTEM** | Infrastructure, security, and administrative notices | Service restart, database maintenance, user permission changes |

### Severity Badges
* **CRITICAL** (Red): Immediate attention required (e.g., Critical Alert $95+$ score, model inference pipeline failure).
* **HIGH** (Orange): Significant security event (e.g., High-risk alert, severe data drift warning).
* **INFO** (Blue): Informational updates (e.g., Case assignment, retraining job completed successfully).

---

## 3. Managing Notifications

### Mark as Read / Unread
* **Individual**: Click the blue dot indicator on any notification row to toggle its read/unread status.
* **Bulk Action**: Click **Mark All as Read** at the top of the notification hub or dropdown to clear unread badges.

### Deep Navigation Links
Every notification card includes a direct link:
* Security Alert notifications link directly to `/alerts/:id`.
* Case Assignment notifications link directly to `/cases/:id`.
* Model Drift notifications link directly to `/models`.

---

## 4. Real-Time WebSocket Delivery

The notification system uses an authenticated WebSocket connection (`/api/v1/ws/notifications`) to push notifications instantly to active browser sessions without requiring manual page refreshes.

* If the connection is momentarily interrupted (e.g., during network handoff), the frontend automatically reconnects and synchronizes any missed notifications from the database backend.
