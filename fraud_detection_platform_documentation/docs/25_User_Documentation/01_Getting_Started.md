# 01 — Getting Started & Workspace Navigation

## 1. Accessing the Platform

1. Launch a modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, or Apple Safari).
2. Navigate to your organization's designated Security Operations Center URL (e.g. `https://fraudshield.yourdomain.com` or `http://localhost:5173` for local development).
3. The platform displays the unified **Security Authentication Portal**.

---

## 2. Authentication & First Login

```text
┌────────────────────────────────────────────────────────┐
│         FRAUD & ANOMALY DETECTION PLATFORM             │
│                 Security Operations Portal             │
├────────────────────────────────────────────────────────┤
│ Email Address:    [ analyst@fraudshield.internal ]     │
│ Password:         [ **************************** ]     │
│                                                        │
│                  [ Sign In to SOC Shell ]              │
└────────────────────────────────────────────────────────┘
```

1. Enter your assigned organizational email address and password.
2. Click **Sign In to SOC Shell**.
3. Upon successful cryptographic JWT verification, the platform initializes the application shell and redirects you to the **SOC Dashboard**.
4. If authentication fails, review your credentials or contact your security administrator. (Accounts with suspended or inactive status are denied access).

---

## 3. Application Shell & Interface Anatomy

The SOC application shell is organized into three primary structural regions:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ TOP NAVIGATION BAR: Real-Time Status | Notifications | Theme | Profile  │
├──────────────┬─────────────────────────────────────────────────────────┤
│ SIDEBAR      │ MAIN WORKSPACE VIEW                                     │
│ • Dashboard  │                                                         │
│ • Txns       │                                                         │
│ • Alerts     │                                                         │
│ • Cases      │                                                         │
│ • Profiles   │                                                         │
│ • Search     │                                                         │
│ • Analytics  │                                                         │
│ • Models     │                                                         │
│ • Admin      │                                                         │
└──────────────┴─────────────────────────────────────────────────────────┘
```

### 3.1 Top Navigation Bar
- **Subsystem Connection Indicator**: Green pulsing badge indicating live WebSocket connectivity.
- **Notification Bell**: Displays unread high-priority security notifications and drift warnings.
- **Theme Toggle**: Switch between **Dark SOC Mode** (optimized for low-light command centers) and **Light Mode**.
- **User Profile & Logout**: Displays your active email and role badge (`ADMIN`, `ANALYST`, or `VIEWER`) with one-click logout.

### 3.2 Collapsible Navigation Sidebar
Organized into two operational sections:
- **Operations & Triage**: SOC Dashboard, Live Transactions, Alerts Triage, Case Management, 360° Risk Profiles, Historical Search, Analytics, ML Models, and Notification Center.
- **Administration & Governance** *(Admins Only)*: Admin Overview, Observability & Health, Fraud Rules Engine, User & Role Access, Risk Thresholds, and Audit Logs Trail.
