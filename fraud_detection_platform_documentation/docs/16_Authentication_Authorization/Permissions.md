# Fine-Grained Permissions Matrix

The database foundation binds granular permissions to roles via the `role_permissions` join table.

## Permission Catalog

| Category | Permission Code | Description | Granted Roles |
| :--- | :--- | :--- | :--- |
| **Transactions** | `transaction.read` | View live transaction streams & details | `ADMIN`, `ANALYST`, `VIEWER` |
| | `transaction.create` | Ingest new transactions via API | `ADMIN`, `ANALYST` |
| | `transaction.update` | Modify transaction annotations/flags | `ADMIN`, `ANALYST` |
| **Alerts** | `alert.read` | Access real-time alerts triage queue | `ADMIN`, `ANALYST`, `VIEWER` |
| | `alert.update` | Change alert status (ACKNOWLEDGED, INVESTIGATING) | `ADMIN`, `ANALYST` |
| | `alert.assign` | Assign/reassign alert to analysts | `ADMIN`, `ANALYST` |
| **Cases** | `case.read` | View investigation case dossiers | `ADMIN`, `ANALYST`, `VIEWER` |
| | `case.create` | Create new investigation case | `ADMIN`, `ANALYST` |
| | `case.update` | Add notes, evidence, status transitions | `ADMIN`, `ANALYST` |
| | `case.assign` | Reassign case investigator | `ADMIN`, `ANALYST` |
| | `case.resolve` | Mark case RESOLVED or CLOSED | `ADMIN`, `ANALYST` |
| **Rules** | `rule.read` | View deterministic rule definitions & weights | `ADMIN`, `ANALYST`, `VIEWER` |
| | `rule.manage` | Modify rule conditions, thresholds & priorities | `ADMIN` |
| **Models** | `model.read` | View ML model registry, metrics & drift stats | `ADMIN`, `ANALYST`, `VIEWER` |
| | `model.manage` | Deploy/promote/retire ML model versions | `ADMIN` |
| **Users** | `user.read` | View user profiles and access roles | `ADMIN`, `ANALYST` |
| | `user.manage` | Provision, modify, and deactivate accounts | `ADMIN` |
| **Audit & Settings** | `audit.read` | Review tamper-evident audit logs | `ADMIN`, `ANALYST` |
| | `settings.manage` | Update system-wide risk engine configurations | `ADMIN` |
| **Analytics** | `analytics.read` | Access executive KPI charts & reports | `ADMIN`, `ANALYST`, `VIEWER` |
