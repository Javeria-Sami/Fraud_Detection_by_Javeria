"""
Audit Logging Subsystem Pydantic Schemas.
Section 23 — Audit Logging.
"""
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ActorType(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    SYSTEM = "SYSTEM"
    SERVICE = "SERVICE"
    SCHEDULED_JOB = "SCHEDULED_JOB"
    API = "API"


class AuditSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AuditOutcome(str, Enum):
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    DENIED = "DENIED"
    PARTIAL = "PARTIAL"


class ResourceType(str, Enum):
    USER = "User"
    ROLE = "Role"
    PERMISSION = "Permission"
    TRANSACTION = "Transaction"
    FRAUD_RULE = "FraudRule"
    ALERT_CONFIGURATION = "AlertConfiguration"
    ALERT = "Alert"
    CASE = "Case"
    MODEL = "MLModel"
    MODEL_VERSION = "MLModelVersion"
    MODEL_MONITORING_RUN = "ModelMonitoringRun"
    RETRAINING_RUN = "ModelRetrainingRun"
    SYSTEM_SETTING = "SystemSetting"
    AUTHENTICATION = "Authentication"
    SECURITY = "Security"
    SYSTEM = "System"
    API = "API"


class AuditAction(str, Enum):
    # Authentication
    LOGIN = "LOGIN"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    TOKEN_REFRESH = "TOKEN_REFRESH"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED"

    # Authorization / Security
    ACCESS_DENIED = "ACCESS_DENIED"
    PERMISSION_CHANGED = "PERMISSION_CHANGED"
    ROLE_CHANGED = "ROLE_CHANGED"
    PRIVILEGE_ESCALATION_BLOCKED = "PRIVILEGE_ESCALATION_BLOCKED"

    # User Administration
    USER_CREATE = "USER_CREATE"
    USER_UPDATE = "USER_UPDATE"
    USER_STATUS_CHANGE = "USER_STATUS_CHANGE"
    USER_ROLE_CHANGE = "USER_ROLE_CHANGE"
    USER_DEACTIVATE_BLOCKED = "USER_DEACTIVATE_BLOCKED"

    # Settings / Configuration
    SETTING_CREATE = "SETTING_CREATE"
    SETTING_UPDATE = "SETTING_UPDATE"
    SETTING_DELETE = "SETTING_DELETE"

    # Detection & Rules
    RULE_CREATE = "RULE_CREATE"
    RULE_UPDATE = "RULE_UPDATE"
    RULE_VERSION_CREATE = "RULE_VERSION_CREATE"
    RULE_VERSION_ACTIVATE = "RULE_VERSION_ACTIVATE"
    RULE_VERSION_RETIRE = "RULE_VERSION_RETIRE"
    RULE_SIMULATION_EXECUTE = "RULE_SIMULATION_EXECUTE"
    ALERT_CONFIG_UPDATE = "ALERT_CONFIG_UPDATE"

    # Alert Operations
    ALERT_ASSIGNED = "ALERT_ASSIGNED"
    ALERT_ACKNOWLEDGED = "ALERT_ACKNOWLEDGED"
    ALERT_STATUS_CHANGE = "ALERT_STATUS_CHANGE"
    ALERT_RESOLVED = "ALERT_RESOLVED"
    ALERT_DISMISSED = "ALERT_DISMISSED"
    ALERT_ESCALATED = "ALERT_ESCALATED"

    # Case Management
    CASE_CREATE = "CASE_CREATE"
    CASE_UPDATE = "CASE_UPDATE"
    CASE_ASSIGN = "CASE_ASSIGN"
    CASE_NOTE_ADDED = "CASE_NOTE_ADDED"
    CASE_EVIDENCE_ADDED = "CASE_EVIDENCE_ADDED"
    CASE_ALERT_LINKED = "CASE_ALERT_LINKED"
    CASE_TRANSACTION_LINKED = "CASE_TRANSACTION_LINKED"
    CASE_RESOLVED = "CASE_RESOLVED"
    CASE_CLOSED = "CASE_CLOSED"
    CASE_REOPENED = "CASE_REOPENED"

    # ML / MLOps & Retraining
    MODEL_REGISTERED = "MODEL_REGISTERED"
    MODEL_EVALUATED = "MODEL_EVALUATED"
    MODEL_APPROVED = "MODEL_APPROVED"
    MODEL_DEPLOYED = "MODEL_DEPLOYED"
    MODEL_RETIRED = "MODEL_RETIRED"
    MODEL_MONITORING_RUN = "MODEL_MONITORING_RUN"
    MODEL_RETRAINING_STARTED = "MODEL_RETRAINING_STARTED"
    MODEL_RETRAINING_COMPLETED = "MODEL_RETRAINING_COMPLETED"
    MODEL_RETRAINING_FAILED = "MODEL_RETRAINING_FAILED"
    MODEL_RETRAINING_CANCELLED = "MODEL_RETRAINING_CANCELLED"

    # Transactions & Search
    TRANSACTION_INVESTIGATED = "TRANSACTION_INVESTIGATED"
    HISTORICAL_SEARCH_EXECUTED = "HISTORICAL_SEARCH_EXECUTED"


class AuditEventCreate(BaseModel):
    actor_user_id: Optional[str] = None
    actor_email: str
    actor_role: str = "analyst"
    actor_type: str = "USER"
    action: str
    resource_type: str  # maps to entity_type
    resource_id: str  # maps to entity_id
    outcome: str = "SUCCESS"  # maps to result
    severity: str = "INFO"
    source: str = "API"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    correlation_id: Optional[str] = None
    session_id: Optional[str] = None
    diff_old: Optional[Dict[str, Any]] = None
    diff_new: Optional[Dict[str, Any]] = None
    details: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AuditLogResponse(BaseModel):
    id: str
    actor_user_id: Optional[str] = None
    actor_email: Optional[str] = None
    actor_role: Optional[str] = None
    actor_type: str = "USER"
    action: str
    target_entity: str
    resource_type: str
    target_id: str
    resource_id: str
    status: str
    outcome: str
    severity: str = "INFO"
    source: str = "API"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    correlation_id: Optional[str] = None
    session_id: Optional[str] = None
    diff_old: Optional[Dict[str, Any]] = None
    diff_new: Optional[Dict[str, Any]] = None
    details: Optional[str] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    timestamp: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[AuditLogResponse]


class AuditStatsResponse(BaseModel):
    total_events: int
    events_today: int
    high_critical_count: int
    failed_denied_count: int
    admin_actions_count: int
    action_breakdown: Dict[str, int]
    severity_breakdown: Dict[str, int]
    outcome_breakdown: Dict[str, int]
    generated_at: str
