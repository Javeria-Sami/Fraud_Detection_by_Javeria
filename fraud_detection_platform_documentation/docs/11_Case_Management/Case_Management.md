# Section 15 — Case Management & Investigation Workspace

## 1. Overview
The Case Management system provides a dedicated Security Operations Center (SOC) investigation workspace for fraud analysts, investigators, and compliance officers to aggregate related security alerts and financial transactions into formal investigation cases.

## 2. Core Domain & Schema
A case is represented in the database as:
```text
Case (CASE-YYYY-XXXXXX)
 ├── Linked Security Alerts (case_alerts association table)
 ├── Linked Financial Transactions (case_transactions association table)
 ├── Investigation Notes (case_notes table)
 ├── Evidence Artifacts (case_evidence table)
 └── Case Timeline & Audit History (case_history table)
```

## 3. Investigation Lifecycle State Machine
Case status transitions follow a validated transition matrix with optimistic concurrency locking:
- `OPEN` &rarr; `INVESTIGATING`, `CLOSED`
- `INVESTIGATING` &rarr; `PENDING`, `RESOLVED`, `CLOSED`
- `PENDING` &rarr; `INVESTIGATING`, `RESOLVED`, `CLOSED`
- `RESOLVED` &rarr; `CLOSED`, `REOPENED`, `OPEN`, `INVESTIGATING`
- `CLOSED` &rarr; `REOPENED`, `OPEN`
- `REOPENED` &rarr; `INVESTIGATING`, `RESOLVED`, `CLOSED`

## 4. Formal Resolution Categories
When resolving an investigation case, authorized analysts must select a resolution outcome:
- **Confirmed Fraud**: Malicious or unauthorized activity; automatically updates user risk profiling and escalates incident count.
- **False Positive**: Benign customer activity incorrectly flagged by rule or anomaly threshold.
- **Legitimate Activity**: Verified and authorized by cardholder.
- **Suspicious / Inconclusive**: Insufficient evidence to confirm fraud or innocence.
- **Other**: Operational or duplicate resolution.

Resolving a case automatically transitions all linked alerts to `RESOLVED` status and records an audit log entry.

## 5. API Endpoints
- `GET /api/v1/cases`: Multidimensional filtering (`search`, `status`, `severity`, `assigned_analyst`, `user_id`, `start_date`, `end_date`), allowlisted sorting, pagination, and response headers (`X-Total-Count`, `X-Page`, `X-Page-Size`, `X-Total-Pages`).
- `GET /api/v1/cases/paginated`: Returns `CasePaginatedResponse` envelope.
- `GET /api/v1/cases/stats`: Aggregate KPI metrics for top workspace cards (`total_cases`, `open_cases`, `investigating_cases`, `critical_cases`, `unassigned_cases`, `resolved_today`).
- `GET /api/v1/cases/{case_id}`: Full joined case investigation detail.
- `POST /api/v1/cases`: Case creation with unique human-readable ID (`CASE-YYYY-XXXXXX`), relationship linking, initial note, and audit logging.
- `PATCH /api/v1/cases/{case_id}`: Core field updates.
- `POST /api/v1/cases/{case_id}/status`: Validated status transition with optimistic concurrency check.
- `POST /api/v1/cases/{case_id}/assign`: Analyst assignment/reassignment.
- `POST /api/v1/cases/{case_id}/alerts` & `DELETE /api/v1/cases/{case_id}/alerts/{alert_id}`: Idempotent alert linking/unlinking.
- `POST /api/v1/cases/{case_id}/transactions` & `DELETE /api/v1/cases/{case_id}/transactions/{transaction_id}`: Transaction linking/unlinking.
- `GET /api/v1/cases/{case_id}/notes` & `POST /api/v1/cases/{case_id}/notes`: Chronological investigation notes.
- `GET /api/v1/cases/{case_id}/evidence` & `POST /api/v1/cases/{case_id}/evidence`: Structured evidence artifacts with JSON payload.
- `GET /api/v1/cases/{case_id}/timeline`: Audit history timeline.
- `POST /api/v1/cases/{case_id}/resolve`: Case resolution with outcome classification and alert sync.

## 6. Real-Time WebSocket Updates
All state mutations publish real-time events (`case.created`, `case.updated`) over the central WebSocket manager to notify active analysts.
