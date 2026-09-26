# 02 — Roles, Permissions & RBAC Governance

## 1. Overview

The platform implements Role-Based Access Control (RBAC) enforced at both the API Gateway and frontend routing layers. Each user is assigned a role that determines their accessible routes, investigation capabilities, and administrative privileges.

---

## 2. Capabilities Matrix

| System Module / Action | Viewer | Analyst | Administrator |
| :--- | :---: | :---: | :---: |
| **SOC Dashboard & Live KPIs** | ✅ View | ✅ View | ✅ View |
| **Transaction Explorer & Details** | ✅ View | ✅ View | ✅ View |
| **Alert Center (View & Search)** | ✅ View | ✅ View | ✅ View |
| **Alert Triage (Acknowledge, Assign, Dismiss)** | ❌ | ✅ Full | ✅ Full |
| **Case Management (Create, Notes, Evidence)** | ❌ | ✅ Full | ✅ Full |
| **360° Risk Profiles (User/Device/Merchant)** | ✅ View | ✅ View | ✅ View |
| **Cross-Entity Historical Search** | ✅ View | ✅ View | ✅ View |
| **Analytics & Business Intelligence** | ✅ View | ✅ View | ✅ View |
| **ML Model Monitoring & Drift Metrics** | ✅ View | ✅ View | ✅ View |
| **Notification Center & Preferences** | ✅ Own | ✅ Own | ✅ Own |
| **Fraud Rules Administration (Edit/Version)** | ❌ | ❌ | ✅ Full |
| **Rule Simulations (Dry Run Testing)** | ❌ | ❌ | ✅ Full |
| **User & Role Access Management** | ❌ | ❌ | ✅ Full |
| **System Settings & Risk Thresholds** | ❌ | ❌ | ✅ Full |
| **Audit Logs Trail** | ❌ | ✅ View | ✅ Full |
| **Operational Observability & Health** | ❌ | ❌ | ✅ Full |
| **Model Retraining Trigger** | ❌ | ❌ | ✅ Full |

---

## 3. Role Profiles

### 3.1 Viewer (`viewer`)
- Designed for auditors, compliance officers, and executive observers.
- Read-only access across transactions, risk scores, historical search, analytics, and model telemetry.
- Mutation actions (such as acknowledging alerts, creating cases, or editing rules) are disabled.

### 3.2 Analyst (`analyst`)
- Designed for frontline fraud analysts, SOC investigators, and risk operations specialists.
- Full operational authority over alerts and cases: acknowledge alerts, escalate to cases, attach evidence files, write investigation notes, and mark cases as resolved.
- Read-only access to audit logs and ML monitoring metrics.

### 3.3 Administrator (`admin`)
- Designed for security architects, risk managers, and system administrators.
- Unrestricted authority over all operational, administrative, and detection capabilities.
- Configures fraud rules, creates versioned rule updates, adjusts risk score thresholds, manages user accounts, reviews audit trails, and monitors subsystem observability.
