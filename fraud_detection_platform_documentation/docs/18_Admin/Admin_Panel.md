# Section 22: Platform Administration & Governance Panel

## 1. Overview & Architecture

The **FraudShield AI Platform Administration Panel** provides centralized governance, live telemetry diagnostics, RBAC operator provisioning, typed system policy configuration, and seamless integration with the Section 19 Fraud Rules Engine, Section 20 Model Monitoring, and Section 21 Model Retraining subsystems.

### Core Architectural Principles:
1. **Defense-in-Depth RBAC**: All administrative routes and APIs are strictly protected with the `ADMIN` role requirement (`require_roles(["admin"])`). Unprivileged requests receive HTTP 403 Forbidden.
2. **Real Telemetry Diagnostics**: Platform health status is evaluated dynamically via live health checks across PostgreSQL, FastAPI Gateway, Transaction Ingestion, Feature Store, Rule Engine, ML Inference Engine, Multi-Tier Risk Engine, Alert Engine, WebSocket Bus, and Drift Telemetry.
3. **Safety & Non-Lockout Invariants**: Enforces Last-Active-Administrator protection and Self-Lockout safeguards across account status and role mutations.
4. **Secret Masking & Zero Sensitive Leakage**: Outbound secrets, credentials, tokens, and password hashes are strictly redacted (`••••••••••••`) in responses and audit diffs.
5. **Auditable Configuration Lifecycle**: All administrative actions create structured, tamper-evident audit logs capturing actor, action, timestamp, entity diffs, and justification reasons.

---

## 2. Admin Router & API Endpoints

All administration endpoints reside under the `/api/v1/admin` prefix:

| Endpoint | Method | Description | Security / RBAC |
| :--- | :--- | :--- | :--- |
| `/api/v1/admin/overview` | `GET` | Consolidated telemetry (platform health, user stats, detection stats, ML stats, system info) | `ADMIN` Required |
| `/api/v1/admin/platform/status` | `GET` | Live component health diagnostics and latency metrics | `ADMIN` Required |
| `/api/v1/admin/users` | `GET` | Paginated, searchable, and filtered list of operator accounts | `ADMIN` Required |
| `/api/v1/admin/users/{id}` | `GET` | Detailed operator profile with effective permissions and audit activity | `ADMIN` Required |
| `/api/v1/admin/users` | `POST` | Provisions new operator account with bcrypt password hashing | `ADMIN` Required |
| `/api/v1/admin/users/{id}/status` | `PATCH` | Activates/deactivates user with Last-Admin & Self-Lockout protections | `ADMIN` Required |
| `/api/v1/admin/users/{id}/role` | `PATCH` | Updates assigned role with Last-Admin demotion protection | `ADMIN` Required |
| `/api/v1/admin/roles` | `GET` | Lists all system roles (`ADMIN`, `ANALYST`, `VIEWER`) with user and permission counts | `ADMIN` Required |
| `/api/v1/admin/permissions` | `GET` | Catalog of all granular system permissions categorized by functional domain | `ADMIN` Required |
| `/api/v1/admin/permission-matrix` | `GET` | Comprehensive role-to-permission mapping matrix | `ADMIN` Required |
| `/api/v1/admin/settings` | `GET` | Categorized typed system settings registry with masked sensitive values | `ADMIN` Required |
| `/api/v1/admin/settings/{key}` | `PUT` / `PATCH` | Validates and persists setting update with audit logging | `ADMIN` Required |
| `/api/v1/admin/rules` | `GET` | Lists compiled fraud detection rules with telemetry and version info | `ADMIN` Required |
| `/api/v1/admin/rules/{id}` | `GET` | Full rule configuration and version history timeline | `ADMIN` Required |
| `/api/v1/admin/rules/{id}` | `PATCH` | Updates rule metadata, severity, weight, and configuration | `ADMIN` Required |
| `/api/v1/admin/rules/{id}/versions` | `GET` / `POST` | Version control management (immutable historical revisions) | `ADMIN` Required |
| `/api/v1/admin/rules/validate` | `POST` | Dry-run validation of rule configurations | `ADMIN` Required |
| `/api/v1/admin/rules/{id}/simulate` | `POST` | Zero-side-effect rule simulation against synthetic transaction payloads | `ADMIN` Required |
| `/api/v1/admin/alerts/config` | `GET` / `PUT` | Centralized alert thresholds, cooldown suppression, and priorities | `ADMIN` Required |

---

## 3. Frontend Navigation & Pages

The administrative UI is accessible under the `/admin` routing tree:
- **`/admin` & `/admin/overview`** (`AdminOverview.tsx`): Real-time KPI summaries, component diagnostics table, runtime environment info, and quick launchpads.
- **`/admin/users`** (`AdminUsers.tsx`): Multi-tab interface featuring server-side searchable operator accounts, pagination, user inspection drawer, account provisioning modal, status toggling, and complete Roles & Permission Matrix.
- **`/admin/settings`** (`AdminSettings.tsx`): Categorized typed policy controls (booleans, enums, numbers with bounds, json, masked secrets) with validation and audit justification prompts.
- **`/admin/rules`** (`AdminRules.tsx`): Rule Studio with live parameter configuration, dry-run validator, simulation engine, and version diff analyzer.
- **`/admin/audit-logs`** (`AuditLogs.tsx`): Tamper-evident trail of administrative mutations.
