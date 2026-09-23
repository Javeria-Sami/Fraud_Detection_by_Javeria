"""
Admin Panel Pydantic Schemas.
Section 22 — Admin Panel.
"""
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# ---------------------------------------------------------------------------
# Platform Diagnostics & Status
# ---------------------------------------------------------------------------

class PlatformComponentStatus(BaseModel):
    name: str
    status: str  # "HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "UNKNOWN"
    latency_ms: Optional[float] = None
    details: Optional[str] = None
    last_checked: str


class PlatformStatusResponse(BaseModel):
    overall_status: str  # "HEALTHY" | "DEGRADED" | "UNAVAILABLE"
    components: List[PlatformComponentStatus]
    environment: str
    generated_at: str


# ---------------------------------------------------------------------------
# Admin Overview Dashboard
# ---------------------------------------------------------------------------

class PlatformSummary(BaseModel):
    overall_status: str
    database_status: str
    api_status: str
    ml_service_status: str
    rule_engine_status: str
    alert_engine_status: str
    realtime_event_status: str


class UserSummary(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    admin_count: int
    analyst_count: int
    viewer_count: int


class DetectionSummary(BaseModel):
    active_fraud_rules: int
    total_fraud_rules: int
    active_alert_configs: int
    recent_rule_changes: int


class MLSummary(BaseModel):
    deployed_model_version: str
    model_type: str
    model_health: str
    last_monitoring_run: Optional[str] = None
    latest_retraining_run: Optional[str] = None
    total_model_versions: int


class SystemInfo(BaseModel):
    environment: str
    application_name: str
    backend_version: str
    frontend_version: str
    database_version: str


class AdminOverviewResponse(BaseModel):
    platform: PlatformSummary
    users: UserSummary
    detection: DetectionSummary
    ml: MLSummary
    system: SystemInfo
    generated_at: str


# ---------------------------------------------------------------------------
# User Management & Protection
# ---------------------------------------------------------------------------

class AdminUserListItem(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_login_at: Optional[str] = None


class AdminUserListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    users: List[AdminUserListItem]


class AdminUserAuditActivity(BaseModel):
    id: str
    action: str
    target_entity: str
    target_id: Optional[str] = None
    timestamp: str
    details: Optional[str] = None


class AdminUserDetailResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    role: str
    role_description: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_login_at: Optional[str] = None
    effective_permissions: List[str]
    is_customer: bool = False
    customer_risk_score: Optional[float] = None
    customer_risk_tier: Optional[str] = None
    recent_activity: List[AdminUserAuditActivity] = []


class UserStatusUpdateRequest(BaseModel):
    is_active: bool
    reason: Optional[str] = None


class UserRoleUpdateRequest(BaseModel):
    role: str
    reason: Optional[str] = None


class AdminUserCreateRequest(BaseModel):
    email: str
    username: str
    full_name: str
    password: str
    role: str = "viewer"
    is_active: bool = True


# ---------------------------------------------------------------------------
# Roles & Permissions
# ---------------------------------------------------------------------------

class PermissionItem(BaseModel):
    id: str
    name: str
    category: str
    description: Optional[str] = None


class RoleDetailResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    user_count: int
    permission_count: int
    permissions: List[str]


class RolePermissionMatrixEntry(BaseModel):
    permission_name: str
    permission_description: Optional[str] = None
    category: str
    granted_roles: Dict[str, bool]  # e.g., {"ADMIN": True, "ANALYST": True, "VIEWER": False}


class PermissionMatrixResponse(BaseModel):
    roles: List[str]
    matrix: List[RolePermissionMatrixEntry]


# ---------------------------------------------------------------------------
# Typed System Settings
# ---------------------------------------------------------------------------

class AdminSettingItem(BaseModel):
    key: str
    category: str  # "GENERAL", "TRANSACTION", "RISK", "DETECTION", "ML", "SECURITY"
    type: str  # "string", "integer", "float", "boolean", "enum", "json"
    value: Any
    default_value: Any
    description: str
    is_sensitive: bool = False
    allowed_values: Optional[List[str]] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    updated_by: Optional[str] = None
    updated_at: Optional[str] = None


class AdminSettingsListResponse(BaseModel):
    categories: List[str]
    settings: List[AdminSettingItem]


class AdminSettingUpdateRequest(BaseModel):
    value: Any
    reason: Optional[str] = None
