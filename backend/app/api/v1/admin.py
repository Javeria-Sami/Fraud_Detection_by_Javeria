"""
Administrative Management API Endpoints (Admin Panel, Fraud Rules, Alert Configurations, Users, Roles, Settings).
Guarded by Admin RBAC with mandatory audit logging and safety protections.
Section 22 — Admin Panel.
"""
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_, text
from sqlalchemy.orm import selectinload

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import require_roles, get_password_hash
from backend.app.core.audit import AuditService
from backend.app.models.user import User, Role, Permission, role_permissions
from backend.app.models.rule import FraudRule, FraudRuleVersion, RuleExecution
from backend.app.models.audit_log import SystemSetting, AuditLog
from backend.app.models.ml_model import MLModelRegistry as MLModelRegistryModel, ModelMonitoringRun, ModelRetrainingRun
from backend.app.models.risk_profile import UserRiskProfile
from backend.app.schemas.auth import UserResponse, UserCreate
from backend.app.schemas.admin import (
    AdminOverviewResponse,
    PlatformSummary,
    UserSummary,
    DetectionSummary,
    MLSummary,
    SystemInfo,
    PlatformComponentStatus,
    PlatformStatusResponse,
    AdminUserListItem,
    AdminUserListResponse,
    AdminUserDetailResponse,
    AdminUserAuditActivity,
    UserStatusUpdateRequest,
    UserRoleUpdateRequest,
    AdminUserCreateRequest,
    RoleDetailResponse,
    PermissionItem,
    RolePermissionMatrixEntry,
    PermissionMatrixResponse,
    AdminSettingItem,
    AdminSettingsListResponse,
    AdminSettingUpdateRequest,
)
from backend.app.schemas.rule import (
    FraudRuleResponse,
    FraudRuleCreate,
    FraudRuleUpdate,
    FraudRuleVersionResponse,
    FraudRuleVersionCreate,
    RuleConfigValidationRequest,
    RuleConfigValidationResponse,
    RuleVersionCompareRequest,
    RuleVersionCompareResponse,
    RuleSimulationRequest,
    RuleSimulationResponse,
    RuleExecutionListResponse,
    AlertEngineConfigDTO,
    AlertEngineConfigUpdateDTO,
)
from backend.app.schemas.profile import SystemSettingResponse, SettingUpdateRequest
from backend.app.engine.rules.registry import RuleRegistry
from backend.app.engine.rules.validator import RuleConfigValidator, RuleConfigValidationError
from backend.app.engine.rules.admin_service import RuleAdminService
from backend.app.engine.alerts.config import AlertConfigService, AlertEngineConfig
from backend.app.engine.admin.platform_diagnostics import PlatformDiagnosticsService
from backend.app.engine.admin.settings_registry import AdminSettingsService, SETTINGS_REGISTRY

router = APIRouter(prefix="/admin", tags=["Administration"], dependencies=[Depends(require_roles(["admin"]))])


# ---------------------------------------------------------------------------
# 1. Admin Overview & Platform Health
# ---------------------------------------------------------------------------

@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    db: AsyncSession = Depends(get_db),
):
    """
    Consolidated Admin Overview providing live platform status, user stats,
    fraud detection telemetry, ML model health, and system metadata.
    """
    now_str = datetime.now(timezone.utc).isoformat()

    # 1. Platform Status Summary
    diag = await PlatformDiagnosticsService.run_diagnostics(db)
    comp_map = {c.name: c.status for c in diag.components}

    platform_summary = PlatformSummary(
        overall_status=diag.overall_status,
        database_status=comp_map.get("PostgreSQL Database", "UNKNOWN"),
        api_status=comp_map.get("FastAPI Gateway", "HEALTHY"),
        ml_service_status=comp_map.get("ML Inference Engine", "HEALTHY"),
        rule_engine_status=comp_map.get("Fraud Rule Engine", "HEALTHY"),
        alert_engine_status=comp_map.get("Alert Engine", "HEALTHY"),
        realtime_event_status=comp_map.get("Real-Time WebSocket Bus", "HEALTHY"),
    )

    # 2. User Statistics
    total_users_res = await db.execute(select(func.count(User.id)))
    total_users = total_users_res.scalar() or 0

    active_users_res = await db.execute(select(func.count(User.id)).where(User.is_active == True))
    active_users = active_users_res.scalar() or 0
    inactive_users = total_users - active_users

    # Count by role
    admin_count_res = await db.execute(
        select(func.count(User.id)).join(Role, User.role_id == Role.id).where(Role.name == "ADMIN")
    )
    admin_count = admin_count_res.scalar() or 0

    analyst_count_res = await db.execute(
        select(func.count(User.id)).join(Role, User.role_id == Role.id).where(Role.name == "ANALYST")
    )
    analyst_count = analyst_count_res.scalar() or 0

    viewer_count_res = await db.execute(
        select(func.count(User.id)).join(Role, User.role_id == Role.id).where(Role.name == "VIEWER")
    )
    viewer_count = viewer_count_res.scalar() or 0

    user_summary = UserSummary(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        admin_count=admin_count,
        analyst_count=analyst_count,
        viewer_count=viewer_count,
    )

    # 3. Detection Summary
    rules = RuleRegistry.list_rules()
    active_fraud_rules = sum(1 for r in rules if r.get("is_active", True))
    total_fraud_rules = len(rules)

    cfg, _, _ = await AlertConfigService.get_config(db)
    active_alert_configs = len(cfg.enabled_alert_types)

    recent_rule_audit_res = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.entity_type == "FraudRule",
            AuditLog.action.in_(["RULE_UPDATE", "RULE_VERSION_ACTIVATE", "RULE_VERSION_RETIRE", "RULE_VERSION_CREATE"])
        )
    )
    recent_rule_changes = recent_rule_audit_res.scalar() or 0

    detection_summary = DetectionSummary(
        active_fraud_rules=active_fraud_rules,
        total_fraud_rules=total_fraud_rules,
        active_alert_configs=active_alert_configs,
        recent_rule_changes=recent_rule_changes,
    )

    # 4. ML Summary
    prod_model_stmt = select(MLModelRegistryModel).where(
        MLModelRegistryModel.status.in_(["DEPLOYED", "PRODUCTION"])
    ).order_by(MLModelRegistryModel.deployed_at.desc())
    prod_model_res = await db.execute(prod_model_stmt)
    prod_model = prod_model_res.scalar_one_or_none()

    total_models_res = await db.execute(select(func.count(MLModelRegistryModel.id)))
    total_models = total_models_res.scalar() or 0

    last_monitoring_stmt = select(ModelMonitoringRun).order_by(ModelMonitoringRun.started_at.desc())
    last_monitoring_res = await db.execute(last_monitoring_stmt)
    last_monitoring = last_monitoring_res.scalar_one_or_none()

    last_retrain_stmt = select(ModelRetrainingRun).order_by(ModelRetrainingRun.created_at.desc())
    last_retrain_res = await db.execute(last_retrain_stmt)
    last_retrain = last_retrain_res.scalar_one_or_none()

    ml_summary = MLSummary(
        deployed_model_version=prod_model.version if prod_model else "v1.0.0-default",
        model_type=prod_model.model_name if prod_model else "Isolation Forest (Default)",
        model_health="HEALTHY" if prod_model else "DEGRADED",
        last_monitoring_run=last_monitoring.started_at.isoformat() if last_monitoring and last_monitoring.started_at else None,
        latest_retraining_run=last_retrain.created_at.isoformat() if last_retrain and last_retrain.created_at else None,
        total_model_versions=total_models,
    )

    # 5. System Info
    system_info = SystemInfo(
        environment="DEVELOPMENT" if settings.DEBUG else "PRODUCTION",
        application_name=settings.PROJECT_NAME,
        backend_version="1.0.0",
        frontend_version="1.0.0",
        database_version="PostgreSQL 15 / SQLite (Async)",
    )

    return AdminOverviewResponse(
        platform=platform_summary,
        users=user_summary,
        detection=detection_summary,
        ml=ml_summary,
        system=system_info,
        generated_at=now_str,
    )


@router.get("/platform/status", response_model=PlatformStatusResponse)
async def get_platform_diagnostics(
    db: AsyncSession = Depends(get_db),
):
    """Returns detailed real-time platform component diagnostic status and latencies."""
    return await PlatformDiagnosticsService.run_diagnostics(db)


# ---------------------------------------------------------------------------
# 2. User Management & Protection
# ---------------------------------------------------------------------------

@router.get("/users", response_model=AdminUserListResponse)
async def list_admin_users(
    query: Optional[str] = Query(None, description="Search by email, username, full name, or user ID"),
    role: Optional[str] = Query(None, description="Filter by role (ADMIN, ANALYST, VIEWER)"),
    is_active: Optional[bool] = Query(None, description="Filter by account status"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("created_at", description="Sort field (created_at, email, full_name, last_login_at)"),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Server-side paginated, searchable, and filtered user management listing.
    """
    stmt = select(User).options(selectinload(User.role))

    # Search query
    if query:
        search_pattern = f"%{query.strip()}%"
        stmt = stmt.where(
            or_(
                User.email.ilike(search_pattern),
                User.username.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
                User.id.ilike(search_pattern),
            )
        )

    # Role filter
    if role:
        stmt = stmt.join(Role, User.role_id == Role.id).where(Role.name == role.upper())

    # Active status filter
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)

    # Total count query
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total_count = total_res.scalar() or 0

    # Sorting
    sort_col = getattr(User, sort_by, User.created_at)
    if sort_order.lower() == "asc":
        stmt = stmt.order_by(sort_col.asc())
    else:
        stmt = stmt.order_by(sort_col.desc())

    # Pagination
    offset = (page - 1) * page_size
    stmt = stmt.offset(offset).limit(page_size)

    res = await db.execute(stmt)
    users = res.scalars().all()

    user_items = [
        AdminUserListItem(
            id=u.id,
            email=u.email,
            username=u.username or u.email.split("@")[0],
            full_name=u.full_name,
            role=u.role.name if u.role else "VIEWER",
            is_active=u.is_active,
            is_verified=u.is_verified,
            created_at=u.created_at.isoformat() if u.created_at else None,
            updated_at=u.updated_at.isoformat() if u.updated_at else None,
            last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
        )
        for u in users
    ]

    return AdminUserListResponse(
        total=total_count,
        page=page,
        page_size=page_size,
        users=user_items,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetailResponse)
async def get_admin_user_detail(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns full administrator-facing user profile, assigned role, effective permissions,
    customer risk tier (if applicable), and recent audit log activities.
    """
    stmt = select(User).options(
        selectinload(User.role).selectinload(Role.permissions),
        selectinload(User.risk_profile),
    ).where((User.id == user_id) | (User.email == user_id) | (User.username == user_id))
    res = await db.execute(stmt)
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail=f"User '{user_id}' not found.")

    # Effective permissions
    effective_perms = []
    if u.role and u.role.permissions:
        effective_perms = [p.name for p in u.role.permissions]

    # Customer profile check
    is_customer = u.risk_profile is not None
    customer_risk_score = u.risk_profile.risk_score if u.risk_profile else None
    customer_risk_tier = u.risk_profile.risk_tier if u.risk_profile else None

    # Fetch recent audit actions performed by or targeted at this user
    audit_stmt = (
        select(AuditLog)
        .where((AuditLog.actor_email == u.email) | (AuditLog.target_id == u.id))
        .order_by(AuditLog.timestamp.desc())
        .limit(10)
    )
    audit_res = await db.execute(audit_stmt)
    recent_audits = audit_res.scalars().all()

    audit_items = [
        AdminUserAuditActivity(
            id=a.id,
            action=a.action,
            target_entity=a.entity_type,
            target_id=a.target_id,
            timestamp=a.timestamp.isoformat() if a.timestamp else "",
            details=a.details,
        )
        for a in recent_audits
    ]

    return AdminUserDetailResponse(
        id=u.id,
        email=u.email,
        username=u.username or u.email.split("@")[0],
        full_name=u.full_name,
        role=u.role.name if u.role else "VIEWER",
        role_description=u.role.description if u.role else None,
        is_active=u.is_active,
        is_verified=u.is_verified,
        created_at=u.created_at.isoformat() if u.created_at else None,
        updated_at=u.updated_at.isoformat() if u.updated_at else None,
        last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
        effective_permissions=effective_perms,
        is_customer=is_customer,
        customer_risk_score=customer_risk_score,
        customer_risk_tier=customer_risk_tier,
        recent_activity=audit_items,
    )


@router.post("/users", response_model=AdminUserListItem, status_code=status.HTTP_201_CREATED)
async def create_admin_user(
    payload: AdminUserCreateRequest,
    db: AsyncSession = Depends(get_db),
    admin_payload: dict = Depends(require_roles(["admin"])),
):
    """
    Creates a new user account with assigned role and audit logging.
    """
    # Check email duplicate
    chk_email = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    if chk_email.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    # Check username duplicate
    chk_username = await db.execute(select(User).where(User.username == payload.username.lower().strip()))
    if chk_username.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this username already exists.")

    # Find Role
    role_stmt = select(Role).where(Role.name == payload.role.upper().strip())
    role_res = await db.execute(role_stmt)
    role_obj = role_res.scalar_one_or_none()
    if not role_obj:
        raise HTTPException(status_code=400, detail=f"Role '{payload.role}' does not exist.")

    new_user = User(
        id=f"USR-{str(uuid.uuid4())[:8].upper()}",
        email=payload.email.lower().strip(),
        username=payload.username.lower().strip(),
        full_name=payload.full_name.strip(),
        hashed_password=get_password_hash(payload.password),
        is_active=payload.is_active,
        is_verified=True,
        role=role_obj,
    )
    db.add(new_user)
    await db.flush()

    admin_email = admin_payload.get("email", "admin")
    await AuditService.log_action(
        db,
        actor_email=admin_email,
        actor_role="admin",
        action="USER_CREATE",
        target_entity="User",
        target_id=new_user.id,
        details=f"Admin created user {new_user.email} ({new_user.full_name}) with role {role_obj.name}",
    )

    await db.commit()
    await db.refresh(new_user)

    return AdminUserListItem(
        id=new_user.id,
        email=new_user.email,
        username=new_user.username,
        full_name=new_user.full_name,
        role=new_user.role.name if new_user.role else "VIEWER",
        is_active=new_user.is_active,
        is_verified=new_user.is_verified,
        created_at=new_user.created_at.isoformat() if new_user.created_at else None,
        updated_at=new_user.updated_at.isoformat() if new_user.updated_at else None,
    )


@router.patch("/users/{user_id}/status", response_model=AdminUserListItem)
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin_payload: dict = Depends(require_roles(["admin"])),
):
    """
    Activates or deactivates a user account.
    Enforces Last Admin Protection and Self-Lockout Protection.
    """
    stmt = select(User).options(selectinload(User.role)).where(User.id == user_id)
    res = await db.execute(stmt)
    target_user = res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    admin_email = admin_payload.get("email", "admin")

    # If deactivating an active account
    if target_user.is_active and not payload.is_active:
        # Check if target is ADMIN
        if target_user.role and target_user.role.name.upper() == "ADMIN":
            # Count active administrators
            admin_count_stmt = (
                select(func.count(User.id))
                .join(Role, User.role_id == Role.id)
                .where(Role.name == "ADMIN", User.is_active == True)
            )
            admin_count_res = await db.execute(admin_count_stmt)
            active_admin_count = admin_count_res.scalar() or 0

            if active_admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot deactivate the last active administrator. Please assign or activate another administrator first.",
                )

            # Self lockout check
            if target_user.email == admin_email and active_admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Self-lockout protection: Cannot deactivate your own administrative account when you are the sole active administrator.",
                )

    old_status = target_user.is_active
    target_user.is_active = payload.is_active

    await AuditService.log_action(
        db,
        actor_email=admin_email,
        actor_role="admin",
        action="USER_STATUS_CHANGE",
        target_entity="User",
        target_id=target_user.id,
        diff_old={"is_active": old_status},
        diff_new={"is_active": target_user.is_active},
        details=f"Changed user status to {'ACTIVE' if payload.is_active else 'INACTIVE'}" + (f" (Reason: {payload.reason})" if payload.reason else ""),
    )

    await db.commit()
    await db.refresh(target_user)

    return AdminUserListItem(
        id=target_user.id,
        email=target_user.email,
        username=target_user.username or target_user.email.split("@")[0],
        full_name=target_user.full_name,
        role=target_user.role.name if target_user.role else "VIEWER",
        is_active=target_user.is_active,
        is_verified=target_user.is_verified,
        created_at=target_user.created_at.isoformat() if target_user.created_at else None,
        updated_at=target_user.updated_at.isoformat() if target_user.updated_at else None,
        last_login_at=target_user.last_login_at.isoformat() if target_user.last_login_at else None,
    )


@router.patch("/users/{user_id}/role", response_model=AdminUserListItem)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin_payload: dict = Depends(require_roles(["admin"])),
):
    """
    Updates the assigned role of a user.
    Enforces Last Admin Protection.
    """
    stmt = select(User).options(selectinload(User.role)).where(User.id == user_id)
    res = await db.execute(stmt)
    target_user = res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    new_role_stmt = select(Role).where(Role.name == payload.role.upper().strip())
    new_role_res = await db.execute(new_role_stmt)
    new_role_obj = new_role_res.scalar_one_or_none()
    if not new_role_obj:
        raise HTTPException(status_code=400, detail=f"Role '{payload.role}' does not exist.")

    current_role_name = target_user.role.name.upper() if target_user.role else "VIEWER"
    new_role_name = new_role_obj.name.upper()

    # If demoting an active ADMIN to a non-ADMIN role
    if current_role_name == "ADMIN" and new_role_name != "ADMIN" and target_user.is_active:
        admin_count_stmt = (
            select(func.count(User.id))
            .join(Role, User.role_id == Role.id)
            .where(Role.name == "ADMIN", User.is_active == True)
        )
        admin_count_res = await db.execute(admin_count_stmt)
        active_admin_count = admin_count_res.scalar() or 0

        if active_admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove administrator role from the last active administrator. Please promote another user to administrator first.",
            )

    old_role_str = current_role_name
    target_user.role = new_role_obj

    admin_email = admin_payload.get("email", "admin")
    await AuditService.log_action(
        db,
        actor_email=admin_email,
        actor_role="admin",
        action="USER_ROLE_CHANGE",
        target_entity="User",
        target_id=target_user.id,
        diff_old={"role": old_role_str},
        diff_new={"role": new_role_obj.name},
        details=f"Changed user {target_user.email} role from {old_role_str} to {new_role_obj.name}" + (f" (Reason: {payload.reason})" if payload.reason else ""),
    )

    await db.commit()
    await db.refresh(target_user)

    return AdminUserListItem(
        id=target_user.id,
        email=target_user.email,
        username=target_user.username or target_user.email.split("@")[0],
        full_name=target_user.full_name,
        role=target_user.role.name,
        is_active=target_user.is_active,
        is_verified=target_user.is_verified,
        created_at=target_user.created_at.isoformat() if target_user.created_at else None,
        updated_at=target_user.updated_at.isoformat() if target_user.updated_at else None,
        last_login_at=target_user.last_login_at.isoformat() if target_user.last_login_at else None,
    )


# ---------------------------------------------------------------------------
# 3. Roles & Permissions Management
# ---------------------------------------------------------------------------

@router.get("/roles", response_model=List[RoleDetailResponse])
async def list_admin_roles(
    db: AsyncSession = Depends(get_db),
):
    """Lists all system roles with assigned user counts and granted permissions."""
    stmt = select(Role).options(selectinload(Role.permissions), selectinload(Role.users))
    res = await db.execute(stmt)
    roles = res.scalars().all()

    output = []
    for r in roles:
        output.append(
            RoleDetailResponse(
                id=r.id,
                name=r.name,
                description=r.description,
                user_count=len(r.users) if r.users else 0,
                permission_count=len(r.permissions) if r.permissions else 0,
                permissions=[p.name for p in r.permissions] if r.permissions else [],
            )
        )
    return output


@router.get("/permissions", response_model=List[PermissionItem])
async def list_admin_permissions(
    db: AsyncSession = Depends(get_db),
):
    """Lists all available system permissions categorized by functional domain."""
    stmt = select(Permission).order_by(Permission.name)
    res = await db.execute(stmt)
    perms = res.scalars().all()

    def get_category(p_name: str) -> str:
        prefix = p_name.split(".")[0].lower()
        cat_map = {
            "transaction": "Transactions",
            "alert": "Alerts & Incidents",
            "case": "Case Investigations",
            "user": "Users & Risk Profiles",
            "rule": "Fraud Detection Rules",
            "model": "ML Models & Retraining",
            "analytics": "Analytics & Reports",
            "audit": "Audit & Compliance",
            "settings": "System Settings",
            "admin": "System Administration",
        }
        return cat_map.get(prefix, "General")

    return [
        PermissionItem(
            id=p.id,
            name=p.name,
            category=get_category(p.name),
            description=p.description,
        )
        for p in perms
    ]


@router.get("/permission-matrix", response_model=PermissionMatrixResponse)
async def get_role_permission_matrix(
    db: AsyncSession = Depends(get_db),
):
    """
    Returns complete role-to-permission mapping matrix for security audits.
    """
    # Load all roles with permissions
    roles_stmt = select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
    roles_res = await db.execute(roles_stmt)
    roles = roles_res.scalars().all()
    role_names = [r.name for r in roles]

    # Map role -> set of permission names
    role_perm_map = {r.name: {p.name for p in r.permissions} for r in roles}

    # Load all permissions
    perms_stmt = select(Permission).order_by(Permission.name)
    perms_res = await db.execute(perms_stmt)
    all_perms = perms_res.scalars().all()

    def get_category(p_name: str) -> str:
        prefix = p_name.split(".")[0].lower()
        cat_map = {
            "transaction": "Transactions",
            "alert": "Alerts & Incidents",
            "case": "Case Investigations",
            "user": "Users & Risk Profiles",
            "rule": "Fraud Detection Rules",
            "model": "ML Models & Retraining",
            "analytics": "Analytics & Reports",
            "audit": "Audit & Compliance",
            "settings": "System Settings",
            "admin": "System Administration",
        }
        return cat_map.get(prefix, "General")

    matrix_entries = []
    for p in all_perms:
        granted_dict = {
            r_name: (p.name in role_perm_map.get(r_name, set()))
            for r_name in role_names
        }
        matrix_entries.append(
            RolePermissionMatrixEntry(
                permission_name=p.name,
                permission_description=p.description,
                category=get_category(p.name),
                granted_roles=granted_dict,
            )
        )

    return PermissionMatrixResponse(
        roles=role_names,
        matrix=matrix_entries,
    )


# ---------------------------------------------------------------------------
# 4. Centralized Typed System Settings
# ---------------------------------------------------------------------------

@router.get("/settings", response_model=AdminSettingsListResponse)
async def list_admin_settings(
    db: AsyncSession = Depends(get_db),
):
    """
    Returns categorized system settings with schema definitions, typed values,
    and masked sensitive credentials.
    """
    settings_list = await AdminSettingsService.get_all_settings(db)
    return AdminSettingsListResponse(
        categories=AdminSettingsService.get_categories(),
        settings=[AdminSettingItem(**s) for s in settings_list],
    )


@router.put("/settings/{key}", response_model=AdminSettingItem)
async def update_admin_setting(
    key: str,
    payload: AdminSettingUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin_payload: dict = Depends(require_roles(["admin"])),
):
    """
    Updates a system setting with typed schema validation, range checks,
    and audit logging.
    """
    defn = SETTINGS_REGISTRY.get(key)
    if not defn:
        raise HTTPException(
            status_code=404,
            detail=f"Setting '{key}' is not recognized in the system settings registry.",
        )

    # Validate value
    is_valid, cleaned_val, error_msg = defn.validate_value(payload.value)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Setting validation failed for '{key}': {error_msg}",
        )

    # Fetch existing setting or create new
    stmt = select(SystemSetting).where(SystemSetting.key == key)
    res = await db.execute(stmt)
    setting_row = res.scalar_one_or_none()

    admin_email = admin_payload.get("email", "admin")
    now = datetime.now(timezone.utc)

    old_val = setting_row.value if setting_row else defn.default_value

    if not setting_row:
        setting_row = SystemSetting(
            id=str(uuid.uuid4()),
            key=key,
            value=cleaned_val,
            description=defn.description,
            updated_by=admin_email,
            updated_at=now,
        )
        db.add(setting_row)
    else:
        setting_row.value = cleaned_val
        setting_row.updated_by = admin_email
        setting_row.updated_at = now

    await AuditService.log_action(
        db,
        actor_email=admin_email,
        actor_role="admin",
        action="SETTING_UPDATE",
        target_entity="SystemSetting",
        target_id=key,
        diff_old={"value": "••••••••••••" if defn.is_sensitive else old_val},
        diff_new={"value": "••••••••••••" if defn.is_sensitive else cleaned_val},
        details=f"Updated system setting {key}" + (f" (Reason: {payload.reason})" if payload.reason else ""),
    )

    await db.commit()
    await db.refresh(setting_row)

    display_val = "••••••••••••" if defn.is_sensitive else setting_row.value

    return AdminSettingItem(
        key=defn.key,
        category=defn.category,
        type=defn.setting_type,
        value=display_val,
        default_value="••••••••••••" if defn.is_sensitive else defn.default_value,
        description=setting_row.description or defn.description,
        is_sensitive=defn.is_sensitive,
        allowed_values=defn.allowed_values,
        min_value=defn.min_value,
        max_value=defn.max_value,
        updated_by=setting_row.updated_by,
        updated_at=setting_row.updated_at.isoformat() if setting_row.updated_at else None,
    )


# ---------------------------------------------------------------------------
# 5. Fraud Rule Administration (Preserved from Section 19)
# ---------------------------------------------------------------------------

@router.get("/rules", response_model=List[FraudRuleResponse])
async def list_fraud_rules(
    search: Optional[str] = Query(None, description="Search by code, name, or description"),
    category: Optional[str] = Query(None, description="Filter by category (AMOUNT, VELOCITY, DEVICE, etc.)"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: AsyncSession = Depends(get_db),
):
    """Lists fraud rules with search, status filtering, execution metrics, and active version info."""
    return await RuleAdminService.list_rules(
        db=db,
        search=search,
        category=category,
        severity=severity,
        is_active=is_active,
    )


@router.get("/rules/{rule_id}", response_model=FraudRuleResponse)
async def get_fraud_rule_detail(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full rule detail with active configuration and complete version timeline."""
    rule = await RuleAdminService.get_rule_detail(db, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Fraud rule '{rule_id}' not found.")
    return rule


@router.patch("/rules/{rule_id}", response_model=FraudRuleResponse)
async def update_fraud_rule(
    rule_id: str,
    update_data: FraudRuleUpdate,
    db: AsyncSession = Depends(get_db),
    admin_payload: dict = Depends(require_roles(["admin"])),
):
    """Updates high-level metadata (active status, severity, weight, priority) with audit logging."""
    stmt = select(FraudRule).where((FraudRule.id == rule_id) | (FraudRule.rule_code == rule_id))
    res = await db.execute(stmt)
    rule = res.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Fraud rule not found.")

    if update_data.condition_config is not None:
        try:
            RuleRegistry.validate_configuration(rule.rule_code or rule.id, update_data.condition_config)
        except RuleConfigValidationError as ve:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid configuration: {str(ve)}")

    old_diff = {
        "name": rule.name,
        "weight": rule.weight,
        "severity": rule.severity,
        "is_active": rule.is_active,
        "condition_config": rule.condition_config,
        "version": rule.version,
    }

    if update_data.name is not None:
        rule.name = update_data.name
    if update_data.description is not None:
        rule.description = update_data.description
    if update_data.category is not None:
        rule.category = update_data.category
    if update_data.weight is not None:
        rule.weight = update_data.weight
    if update_data.severity is not None:
        rule.severity = update_data.severity.upper()
    if update_data.priority is not None:
        rule.priority = update_data.priority
    if update_data.is_active is not None:
        rule.is_active = update_data.is_active
    if update_data.condition_config is not None:
        rule.condition_config = update_data.condition_config
    if update_data.version is not None:
        rule.version = update_data.version

    admin_email = admin_payload.get("email", "admin")
    rule.updated_by = admin_email

    new_diff = {
        "name": rule.name,
        "weight": rule.weight,
        "severity": rule.severity,
        "is_active": rule.is_active,
        "condition_config": rule.condition_config,
        "version": rule.version,
    }

    await AuditService.log_action(
        db,
        actor_email=admin_email,
        actor_role="admin",
        action="RULE_UPDATE",
        target_entity="FraudRule",
        target_id=rule.id,
        diff_old=old_diff,
        diff_new=new_diff,
        details=f"Updated fraud rule {rule.id}" + (f" (Reason: {update_data.reason})" if update_data.reason else ""),
    )

    await db.commit()
    await db.refresh(rule)

    return await RuleAdminService.get_rule_detail(db, rule.id)


@router.get("/rules/{rule_id}/versions", response_model=List[FraudRuleVersionResponse])
async def list_rule_versions(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Lists all historical immutable versions for a fraud rule."""
    stmt = (
        select(FraudRuleVersion)
        .where(FraudRuleVersion.rule_id == rule_id)
        .order_by(FraudRuleVersion.created_at.desc())
    )
    res = await db.execute(stmt)
    versions = res.scalars().all()
    return [
        FraudRuleVersionResponse(
            id=v.id,
            rule_id=v.rule_id,
            version=v.version,
            configuration=v.configuration or {},
            threshold=v.threshold,
            weight=v.weight,
            is_active=v.is_active,
            created_by=v.created_by,
            created_at=v.created_at.isoformat() if v.created_at else None,
        )
        for v in versions
    ]


@router.post("/rules/{rule_id}/versions", response_model=FraudRuleVersionResponse, status_code=status.HTTP_201_CREATED)
async def create_rule_version(
    rule_id: str,
    payload: FraudRuleVersionCreate,
    db: AsyncSession = Depends(get_db),
    admin_payload: dict = Depends(require_roles(["admin"])),
):
    """Creates a new immutable version for a rule with validated configuration parameters."""
    admin_email = admin_payload.get("email", "admin")
    try:
        return await RuleAdminService.create_rule_version(
            db=db,
            rule_id=rule_id,
            version_str=payload.version,
            configuration=payload.configuration,
            weight=payload.weight,
            threshold=payload.threshold,
            is_active=payload.is_active,
            actor_email=admin_email,
            reason=payload.reason,
        )
    except RuleConfigValidationError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid configuration: {str(ve)}")
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/rules/{rule_id}/versions/{version_id}/activate", response_model=FraudRuleResponse)
async def activate_rule_version(
    rule_id: str,
    version_id: str,
    reason: Optional[str] = Query(None, description="Reason for version activation"),
    db: AsyncSession = Depends(get_db),
    admin_payload: dict = Depends(require_roles(["admin"])),
):
    """Atomically activates a specific rule version, retiring previously active versions."""
    admin_email = admin_payload.get("email", "admin")
    try:
        return await RuleAdminService.activate_version(
            db=db,
            rule_id=rule_id,
            version_id=version_id,
            actor_email=admin_email,
            reason=reason,
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/rules/{rule_id}/versions/{version_id}/retire", response_model=FraudRuleResponse)
async def retire_rule_version(
    rule_id: str,
    version_id: str,
    reason: Optional[str] = Query(None, description="Reason for version retirement"),
    db: AsyncSession = Depends(get_db),
    admin_payload: dict = Depends(require_roles(["admin"])),
):
    """Retires a rule version safely without deleting historical executions."""
    admin_email = admin_payload.get("email", "admin")
    try:
        return await RuleAdminService.retire_version(
            db=db,
            rule_id=rule_id,
            version_id=version_id,
            actor_email=admin_email,
            reason=reason,
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/rules/validate", response_model=RuleConfigValidationResponse)
async def validate_rule_configuration(
    payload: RuleConfigValidationRequest,
):
    """Dry-run configuration validation with parameter schema and feature dependency diagnostics."""
    is_valid, errors, warnings, req_features = RuleConfigValidator.validate_detailed(
        payload.rule_code, payload.configuration
    )
    return RuleConfigValidationResponse(
        valid=is_valid,
        rule_code=payload.rule_code,
        cleaned_configuration=payload.configuration if is_valid else {},
        errors=errors,
        warnings=warnings,
        required_features=req_features,
    )


@router.post("/rules/versions/compare", response_model=RuleVersionCompareResponse)
async def compare_rule_versions(
    payload: RuleVersionCompareRequest,
    db: AsyncSession = Depends(get_db),
):
    """Computes field-by-field diff between two historical rule versions."""
    try:
        return await RuleAdminService.compare_versions(
            db=db,
            version_id_a=payload.version_id_a,
            version_id_b=payload.version_id_b,
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/rules/{rule_id}/simulate", response_model=RuleSimulationResponse)
async def simulate_rule_evaluation(
    rule_id: str,
    payload: RuleSimulationRequest,
    db: AsyncSession = Depends(get_db),
    admin_payload: dict = Depends(require_roles(["admin"])),
):
    """
    Executes a zero-side-effect rule simulation against synthetic transaction and feature data.
    Does NOT modify transaction risk scores, create RuleExecutions, or emit alerts.
    """
    payload.rule_code = payload.rule_code or rule_id
    try:
        result = await RuleAdminService.simulate_rule(db, payload)

        admin_email = admin_payload.get("email", "admin")
        await AuditService.log_action(
            db,
            actor_email=admin_email,
            actor_role="admin",
            action="RULE_SIMULATION_EXECUTE",
            target_entity="FraudRule",
            target_id=payload.rule_code,
            details=f"Simulated rule {payload.rule_code} (Triggered: {result.triggered})",
        )
        await db.commit()
        return result
    except RuleConfigValidationError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid configuration: {str(ve)}")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.get("/rules/{rule_id}/executions", response_model=RuleExecutionListResponse)
async def list_rule_executions(
    rule_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves paginated recent execution telemetry for a specific rule."""
    return await RuleAdminService.list_rule_executions(db, rule_id, limit, offset)


# ---------------------------------------------------------------------------
# 6. Alert Engine Configuration (Preserved from Section 19)
# ---------------------------------------------------------------------------

@router.get("/alerts/config", response_model=AlertEngineConfigDTO)
async def get_alert_configuration(
    db: AsyncSession = Depends(get_db),
):
    """Retrieves the active centralized Alert Engine configuration (thresholds, cooldowns, priorities)."""
    cfg, updated_at, updated_by = await AlertConfigService.get_config(db)
    return AlertEngineConfigDTO(
        alert_config_version=cfg.alert_config_version,
        high_risk_threshold=cfg.high_risk_threshold,
        critical_risk_threshold=cfg.critical_risk_threshold,
        ml_anomaly_threshold=cfg.ml_anomaly_threshold,
        cooldown_seconds=cfg.cooldown_seconds,
        enable_cooldown=cfg.enable_cooldown,
        enable_critical_cooldown_override=cfg.enable_critical_cooldown_override,
        enabled_alert_types=cfg.enabled_alert_types,
        severity_priority_map=cfg.severity_priority_map,
        updated_at=updated_at,
        updated_by=updated_by,
    )


@router.put("/alerts/config", response_model=AlertEngineConfigDTO)
async def update_alert_configuration(
    payload: AlertEngineConfigUpdateDTO,
    db: AsyncSession = Depends(get_db),
    admin_payload: dict = Depends(require_roles(["admin"])),
):
    """Validates and updates active Alert Engine configuration with audit logging."""
    admin_email = admin_payload.get("email", "admin")
    try:
        new_cfg, updated_at, updated_by = await AlertConfigService.update_config(
            db=db,
            updates=payload.model_dump(exclude_unset=True),
            actor_email=admin_email,
            reason=payload.reason,
        )
        return AlertEngineConfigDTO(
            alert_config_version=new_cfg.alert_config_version,
            high_risk_threshold=new_cfg.high_risk_threshold,
            critical_risk_threshold=new_cfg.critical_risk_threshold,
            ml_anomaly_threshold=new_cfg.ml_anomaly_threshold,
            cooldown_seconds=new_cfg.cooldown_seconds,
            enable_cooldown=new_cfg.enable_cooldown,
            enable_critical_cooldown_override=new_cfg.enable_critical_cooldown_override,
            enabled_alert_types=new_cfg.enabled_alert_types,
            severity_priority_map=new_cfg.severity_priority_map,
            updated_at=updated_at,
            updated_by=updated_by,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid alert configuration: {str(ve)}")
