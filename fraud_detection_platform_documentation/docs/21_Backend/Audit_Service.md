# Backend Audit Service Architecture

## 1. Responsibilities

The `AuditService` (`AuditLogService`) in `backend/app/core/audit.py` provides the centralized logging backend for the entire platform.

### Core Modules:
- `backend/app/core/audit.py`: Authoritative recording engine with `sanitize_audit_data` recursive masking, actor type derivation, default severity resolution, and fail-safe persistence.
- `backend/app/models/audit_log.py`: `AuditLog` SQLAlchemy ORM model with composite indexing.
- `backend/app/schemas/audit.py`: Standardized Pydantic schemas, enums, and request/response models.
- `backend/app/api/v1/audit.py`: REST API router exposing `/audit-logs`, `/audit-logs/{id}`, and `/audit-logs/stats`.

## 2. Usage Pattern

```python
from backend.app.core.audit import AuditService

await AuditService.log_action(
    session=db,
    actor_email="admin@fraudshield.io",
    actor_role="admin",
    action="RULE_VERSION_ACTIVATE",
    target_entity="FraudRuleVersion",
    target_id="VER-001",
    diff_old={"is_active": False},
    diff_new={"is_active": True},
    details="Activated Rule Version v2.1 for production evaluation",
    severity="HIGH"
)
```
