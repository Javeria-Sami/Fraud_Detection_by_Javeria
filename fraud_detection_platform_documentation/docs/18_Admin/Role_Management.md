# Role & Permission Management

## 1. Overview

The platform uses a Role-Based Access Control (RBAC) model defining explicit privilege boundaries between administrators, fraud analysts, and executive viewers.

---

## 2. Standard System Roles

| Role | Scope & Privileges | Typical Users |
| :--- | :--- | :--- |
| **`ADMIN`** | Full system governance, user provisioning, system policy tuning, rule version activation/retirement, alert configuration, model retraining management, and audit log inspection. | Security Administrators, DevSecOps Leads |
| **`ANALYST`** | Live transaction monitoring, alert triage, case investigation, 360° risk profile inspection, historical search, analytics dashboard access, and rule simulation. | SOC Analysts, Fraud Investigators |
| **`VIEWER`** | Read-only access to high-level dashboards, analytics reports, and public transaction metrics. Cannot modify cases, rules, alerts, or system configurations. | Executive Stakeholders, Auditors |

---

## 3. Permission Catalog by Category

Granular permissions are categorized into functional domains:

1. **Transactions (`transaction.*`)**: `transaction.read`, `transaction.search`, `transaction.export`, `transaction.simulate`.
2. **Alerts & Incidents (`alert.*`)**: `alert.read`, `alert.triage`, `alert.assign`, `alert.escalate`.
3. **Case Management (`case.*`)**: `case.read`, `case.create`, `case.update`, `case.close`.
4. **Users & Risk Profiles (`user.*`)**: `user.read`, `user.risk_profile.read`, `user.manage`.
5. **Fraud Rules (`rule.*`)**: `rule.read`, `rule.simulate`, `rule.manage`, `rule.version.activate`.
6. **ML Models & Retraining (`model.*`)**: `model.read`, `model.monitoring.read`, `model.retraining.trigger`, `model.retraining.cancel`.
7. **Analytics & Reports (`analytics.*`)**: `analytics.read`, `analytics.export`.
8. **Audit & Compliance (`audit.*`)**: `audit.read`, `audit.export`.
9. **System Settings (`settings.*`)**: `settings.read`, `settings.manage`.
10. **Administration (`admin.*`)**: `admin.access`, `admin.users.manage`, `admin.roles.manage`, `admin.platform.diagnostics`.

---

## 4. Role-To-Permission Matrix API

The endpoint `GET /api/v1/admin/permission-matrix` provides dynamic, field-by-field verification of all role-to-permission grants:

```json
{
  "roles": ["ADMIN", "ANALYST", "VIEWER"],
  "matrix": [
    {
      "permission_name": "rule.manage",
      "permission_description": "Create, modify, and activate fraud detection rules",
      "category": "Fraud Detection Rules",
      "granted_roles": {
        "ADMIN": true,
        "ANALYST": false,
        "VIEWER": false
      }
    },
    {
      "permission_name": "alert.triage",
      "permission_description": "Acknowledge, escalate, and resolve fraud alerts",
      "category": "Alerts & Incidents",
      "granted_roles": {
        "ADMIN": true,
        "ANALYST": true,
        "VIEWER": false
      }
    }
  ]
}
```
