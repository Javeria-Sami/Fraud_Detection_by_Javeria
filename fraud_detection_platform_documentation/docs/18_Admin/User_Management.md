# User Management & Access Control

## 1. Overview

The User Management module in the Admin Panel enables authorized administrators to govern operator accounts, assign operational roles, inspect effective permission sets, review user activity, and maintain system security boundaries.

---

## 2. Key Capabilities

### A. Server-Side Search, Filtering & Pagination
- **Search Query**: Multi-field search querying `email`, `username`, `full_name`, and `user_id`.
- **Role Filtering**: Filter by system role (`ADMIN`, `ANALYST`, `VIEWER`).
- **Status Filtering**: Filter by account status (`active`, `inactive`).
- **Pagination**: Configurable page index and page sizes with server-side count evaluation.

### B. User Provisioning
- Creates new operator accounts with full name, email, optional username, initial temporary password, and assigned role tier.
- Passwords are encrypted with bcrypt hashing.
- Emits structured `USER_CREATE` audit log.

### C. Account Inspection & Governance
- **Profile Summary**: Displays account metadata, verification status, creation timestamp, and last login timestamp.
- **Effective Permissions**: Lists all granular permissions resolved through the user's assigned role.
- **Risk Profiling Context**: If the account represents a customer profile, displays calibrated risk score and tier.
- **Recent Audit Trail**: Lists the last 10 administrative actions performed by or targeted at the operator.

### D. Last-Administrator & Self-Lockout Safety Protections
To prevent accidental or malicious administrative lockout:
1. **Deactivation Protection**: An active administrator cannot be deactivated if they are the last active administrator in the system. The backend returns `400 Bad Request` with an explicit safety error message.
2. **Role Demotion Protection**: An administrator cannot have their `ADMIN` role changed or demoted if they are the last active administrator in the system.
3. **Self-Lockout Protection**: An administrator cannot deactivate their own account when they are the sole active administrator.

---

## 3. Data Schemas

### Request Schema (`AdminUserCreateRequest`)
```json
{
  "email": "analyst@fraudshield.io",
  "username": "analyst_john",
  "full_name": "John Doe",
  "password": "SecurePassword123!",
  "role": "ANALYST",
  "is_active": true
}
```

### Status Update Schema (`UserStatusUpdateRequest`)
```json
{
  "is_active": false,
  "reason": "Operator offboarding completed"
}
```

### Role Update Schema (`UserRoleUpdateRequest`)
```json
{
  "role": "ADMIN",
  "reason": "Promoted to Security Operations Lead"
}
```
