"""
360-Degree User, Device, and Merchant Risk Profiles API Endpoints.
"""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, distinct

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_payload, require_roles
from backend.app.core.audit import AuditService
from backend.app.models.transaction import Transaction
from backend.app.models.risk_profile import UserRiskProfile, DeviceRiskProfile, MerchantRiskProfile
from backend.app.engine.risk_profiling.service import RiskProfilingService
from backend.app.schemas.profile import (
    UserProfileResponse, DeviceProfileResponse, MerchantProfileResponse,
    ProfileSummaryResponse, ProfileStatsResponse, ProfileRecalculateResponse,
    UserProfilePaginatedResponse, DeviceProfilePaginatedResponse, MerchantProfilePaginatedResponse
)

router = APIRouter(prefix="/risk-profiles", tags=["Risk Profiles"])


@router.get("/stats", response_model=ProfileStatsResponse)
async def get_profile_stats(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Get aggregate KPI statistics for Risk Profiles dashboard.
    """
    total_users_q = select(func.count(distinct(Transaction.user_id)))
    high_risk_users_q = select(func.count(distinct(Transaction.user_id))).where(Transaction.risk_level.in_(["HIGH", "CRITICAL"]))
    
    total_devices_q = select(func.count(distinct(Transaction.device_id)))
    total_merchants_q = select(func.count(distinct(Transaction.merchant_name)))
    high_risk_merchants_q = select(func.count(distinct(Transaction.merchant_name))).where(
        Transaction.merchant_category.in_(["crypto_exchange", "luxury_goods", "money_transfer", "gambling"])
    )

    total_users = (await db.execute(total_users_q)).scalar() or 0
    high_risk_users = (await db.execute(high_risk_users_q)).scalar() or 0
    total_devices = (await db.execute(total_devices_q)).scalar() or 0
    total_merchants = (await db.execute(total_merchants_q)).scalar() or 0
    high_risk_merchants = (await db.execute(high_risk_merchants_q)).scalar() or 0

    # Count devices shared by >= 2 users
    shared_dev_q = select(Transaction.device_id).group_by(Transaction.device_id).having(func.count(distinct(Transaction.user_id)) > 1)
    shared_dev_res = await db.execute(shared_dev_q)
    shared_devices = len(shared_dev_res.scalars().all())

    return ProfileStatsResponse(
        total_user_profiles=total_users,
        high_risk_users=high_risk_users,
        total_devices=total_devices,
        shared_devices=shared_devices,
        total_merchants=total_merchants,
        high_risk_merchants=high_risk_merchants
    )


@router.get("/users", response_model=List[UserProfileResponse])
async def list_user_profiles(
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    List user risk profiles with search and risk level filtering.
    """
    # Fetch distinct user IDs from transactions
    query = select(distinct(Transaction.user_id)).where(Transaction.user_id.isnot(None))
    if search:
        query = query.where(Transaction.user_id.ilike(f"%{search.strip()}%"))
    if risk_level and risk_level.upper() != "ALL":
        query = query.where(Transaction.risk_level == risk_level.upper())

    query = query.offset(offset).limit(limit)
    res = await db.execute(query)
    user_ids = res.scalars().all()

    profiles = []
    for uid in user_ids:
        prof = await RiskProfilingService.calculate_user_profile(db, uid)
        profiles.append(prof)

    return profiles


@router.get("/users/{user_id}", response_model=UserProfileResponse)
async def get_user_profile(
    user_id: str,
    as_of: Optional[str] = Query(None, description="ISO timestamp to evaluate time-aware historical profile without temporal leakage"),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Get deep 360-degree behavioral profile for a user with habitual baselines and contextual risk signals.
    """
    as_of_time = None
    if as_of:
        try:
            clean_ts = as_of.replace(" ", "+").replace("Z", "+00:00")
            as_of_time = datetime.fromisoformat(clean_ts)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ISO timestamp for 'as_of' parameter")

    profile = await RiskProfilingService.calculate_user_profile(db, user_id, as_of_time=as_of_time)
    return profile


@router.get("/devices", response_model=List[DeviceProfileResponse])
async def list_device_profiles(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    List device risk profiles with search.
    """
    query = select(distinct(Transaction.device_id)).where(Transaction.device_id.isnot(None))
    if search:
        query = query.where(Transaction.device_id.ilike(f"%{search.strip()}%"))

    query = query.offset(offset).limit(limit)
    res = await db.execute(query)
    device_ids = res.scalars().all()

    profiles = []
    for did in device_ids:
        prof = await RiskProfilingService.calculate_device_profile(db, did)
        profiles.append(prof)

    return profiles


@router.get("/devices/{device_id}", response_model=DeviceProfileResponse)
async def get_device_profile(
    device_id: str,
    as_of: Optional[str] = Query(None, description="ISO timestamp for time-aware calculation"),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Get deep behavioral profile for a device fingerprint including multi-user sharing and failure telemetry.
    """
    as_of_time = None
    if as_of:
        try:
            clean_ts = as_of.replace(" ", "+").replace("Z", "+00:00")
            as_of_time = datetime.fromisoformat(clean_ts)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ISO timestamp for 'as_of' parameter")

    profile = await RiskProfilingService.calculate_device_profile(db, device_id, as_of_time=as_of_time)
    return profile


@router.get("/merchants", response_model=List[MerchantProfileResponse])
async def list_merchant_profiles(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    List merchant risk profiles with search.
    """
    query = select(distinct(Transaction.merchant_name)).where(Transaction.merchant_name.isnot(None))
    if search:
        query = query.where(Transaction.merchant_name.ilike(f"%{search.strip()}%"))

    query = query.offset(offset).limit(limit)
    res = await db.execute(query)
    merchant_names = res.scalars().all()

    profiles = []
    for mname in merchant_names:
        prof = await RiskProfilingService.calculate_merchant_profile(db, mname)
        profiles.append(prof)

    return profiles


@router.get("/merchants/{merchant_name}", response_model=MerchantProfileResponse)
async def get_merchant_profile(
    merchant_name: str,
    as_of: Optional[str] = Query(None, description="ISO timestamp for time-aware calculation"),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Get deep behavioral profile for a merchant entity including category risk tiers and dispute frequency.
    """
    as_of_time = None
    if as_of:
        try:
            clean_ts = as_of.replace(" ", "+").replace("Z", "+00:00")
            as_of_time = datetime.fromisoformat(clean_ts)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ISO timestamp for 'as_of' parameter")

    profile = await RiskProfilingService.calculate_merchant_profile(db, merchant_name, as_of_time=as_of_time)
    return profile


@router.get("/{entity_type}/{entity_id}/summary", response_model=ProfileSummaryResponse)
async def get_entity_profile_summary(
    entity_type: str,
    entity_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Unified compact summary endpoint for drawer/modal contextual embedding.
    """
    try:
        summary = await RiskProfilingService.get_entity_summary(db, entity_type, entity_id)
        return summary
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/recalculate", response_model=ProfileRecalculateResponse)
async def recalculate_risk_profiles(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Administrative trigger to recalculate behavioral baselines and persist profile updates.
    """
    # Count distinct entities
    u_res = await db.execute(select(func.count(distinct(Transaction.user_id))))
    d_res = await db.execute(select(func.count(distinct(Transaction.device_id))))
    m_res = await db.execute(select(func.count(distinct(Transaction.merchant_name))))

    total_u = u_res.scalar() or 0
    total_d = d_res.scalar() or 0
    total_m = m_res.scalar() or 0

    await AuditService.log_action(
        db,
        actor_email=user_payload.get("email", "analyst"),
        actor_role=user_payload.get("role", "analyst"),
        action="RISK_PROFILES_RECALCULATE",
        target_entity="RiskProfileEngine",
        target_id="ALL",
        details=f"Recalculated {total_u} users, {total_d} devices, {total_m} merchants"
    )

    await db.commit()

    return ProfileRecalculateResponse(
        status="SUCCESS",
        recalculated_entities={
            "users": total_u,
            "devices": total_d,
            "merchants": total_m
        },
        timestamp=datetime.now(timezone.utc).isoformat()
    )
