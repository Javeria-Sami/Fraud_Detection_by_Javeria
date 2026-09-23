# Role-Based Access Control (RBAC) Specification

## 1. Core Principles
The platform enforces hierarchical Role-Based Access Control on the backend through reusable FastAPI dependencies. Frontend role checks are strictly for user experience (UX) and navigation filtering.

## 2. Initial System Roles

| Role | Classification | Core Responsibilities & Scope |
| :--- | :--- | :--- |
| **ADMIN** | System Administrator | Full administrative control: user provisioning, role assignments, system settings, rule weight configuration, model promotion/retirement, and compliance auditing. |
| **ANALYST** | Fraud & Security Analyst | Operational & investigation access: live stream monitoring, alert triage, case management, note authorship, evidence attachment, case resolution, and 360 profile analysis. |
| **VIEWER** | Executive / Auditor | Read-only operational oversight: viewing metrics, dashboards, analytics, transaction records, and risk profiles without mutation capabilities. |

## 3. Backend Authorization Dependencies

```python
# Enforce authentication
user: User = Depends(require_authenticated_user)

# Enforce role membership
admin: User = Depends(require_roles(["ADMIN"]))
analyst_or_admin: User = Depends(require_roles(["ADMIN", "ANALYST"]))

# Enforce granular permissions
user: User = Depends(require_permission("case.create"))
user: User = Depends(require_permissions(["transaction.read", "alert.update"]))
```

## 4. Object-Level Authorization Extension
* `check_object_permission(user, resource_type, resource_owner_id)`: Provides a centralized extension hook for verifying tenant/owner assignment during case escalation and alert reassignment.
