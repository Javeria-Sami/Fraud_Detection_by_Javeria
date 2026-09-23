"""
MLOps Model Retraining API Endpoints.
Section 21 — Model Retraining.
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_payload, require_roles
from backend.app.models.ml_model import ModelRetrainingRun
from backend.app.schemas.ml_retraining import (
    StartRetrainingRequest,
    RetrainingRunResponse,
    RetrainingRunListResponse,
    RetrainingConfigResponse,
    UpdateRetrainingConfigRequest
)
from backend.app.engine.ml.retraining.types import (
    RetrainingConfig,
    TemporalSplitConfig,
    ThresholdMethod
)
from backend.app.engine.ml.retraining.service import ModelRetrainingService
from backend.app.engine.ml.retraining.config import MLRetrainingConfigService

router = APIRouter(prefix="/ml-retraining", tags=["MLOps Model Retraining"])


def _to_run_response(r: ModelRetrainingRun) -> RetrainingRunResponse:
    cand_version = None
    if hasattr(r, "candidate_model_version") and r.candidate_model_version:
        cand_version = r.candidate_model_version.version
    elif r.candidate_model_version_id:
        cand_version = r.candidate_model_version_id

    return RetrainingRunResponse(
        id=r.id,
        model_type=r.model_type,
        base_model_version_id=r.base_model_version_id,
        candidate_model_version_id=r.candidate_model_version_id,
        candidate_version=cand_version,
        feature_version=r.feature_version,
        dataset_reference=r.dataset_reference,
        training_window_start=r.training_window_start.isoformat() if r.training_window_start else None,
        training_window_end=r.training_window_end.isoformat() if r.training_window_end else None,
        status=r.status,
        records_used=r.records_used or 0,
        started_at=r.started_at.isoformat() if r.started_at else datetime.now(timezone.utc).isoformat(),
        completed_at=r.completed_at.isoformat() if r.completed_at else None,
        duration_ms=r.duration_ms or 0.0,
        error_message=r.error_message,
        evaluation_report=r.evaluation_report or {},
        model_comparison=r.model_comparison or {},
        data_quality_summary=r.data_quality_summary or {},
        artifact_checksum=r.artifact_checksum,
        created_by=r.created_by,
        created_at=r.created_at.isoformat() if r.created_at else None
    )


@router.post("/run", response_model=RetrainingRunResponse, status_code=status.HTTP_201_CREATED)
async def trigger_retraining(
    payload: StartRetrainingRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Triggers an end-to-end model retraining pipeline:
    Extracts validated historical data, performs chronological temporal split,
    trains candidate Isolation Forest, calibrates decision threshold, evaluates on test split,
    computes objective comparison against active model, serializes artifact, and registers candidate as EVALUATED.
    Strictly preserves current production deployment (Zero Automatic Deployment).
    """
    splits = TemporalSplitConfig(
        train_ratio=payload.train_ratio,
        val_ratio=payload.val_ratio,
        test_ratio=payload.test_ratio
    )

    thresh_method = ThresholdMethod.CONTAMINATION
    if payload.threshold_method.upper() == "FIXED":
        thresh_method = ThresholdMethod.FIXED
    elif payload.threshold_method.upper() == "PERCENTILE":
        thresh_method = ThresholdMethod.PERCENTILE

    cfg = RetrainingConfig(
        model_type=payload.model_type,
        n_estimators=payload.n_estimators,
        contamination=payload.contamination,
        random_state=payload.random_state,
        threshold_method=thresh_method,
        fixed_threshold=payload.fixed_threshold,
        splits=splits,
        min_samples=payload.min_samples,
        target_feature_version=payload.target_feature_version
    )

    try:
        run = await ModelRetrainingService.trigger_retraining(
            session=db,
            config=cfg,
            custom_version=payload.custom_version,
            training_window_start=payload.training_window_start,
            training_window_end=payload.training_window_end,
            actor_email=user_payload.get("email", "unknown"),
            actor_role=user_payload.get("role", "admin")
        )
        return _to_run_response(run)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining pipeline failure: {str(e)}")


@router.get("/runs", response_model=RetrainingRunListResponse)
async def list_retraining_runs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Returns paginated list of historical model retraining runs.
    """
    total, runs = await ModelRetrainingService.list_runs(session=db, limit=limit, offset=offset)
    return RetrainingRunListResponse(
        total=total,
        runs=[_to_run_response(r) for r in runs]
    )


@router.get("/runs/{run_id}", response_model=RetrainingRunResponse)
async def get_retraining_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Retrieves full metrics, stage timeline, data quality summary, and model comparison for a specific run.
    """
    run = await ModelRetrainingService.get_run_detail(session=db, run_id=run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Retraining run '{run_id}' not found.")
    return _to_run_response(run)


@router.post("/runs/{run_id}/cancel", response_model=RetrainingRunResponse)
async def cancel_retraining_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin"]))
):
    """
    Cancels an in-flight retraining run.
    """
    try:
        run = await ModelRetrainingService.cancel_retraining(
            session=db,
            run_id=run_id,
            actor_email=user_payload.get("email", "admin"),
            actor_role=user_payload.get("role", "admin")
        )
        return _to_run_response(run)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.get("/config", response_model=RetrainingConfigResponse)
async def get_retraining_config(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Retrieves current MLOps retraining hyperparameters, splits, and sample size constraints.
    """
    cfg = await MLRetrainingConfigService.get_config(db)
    return RetrainingConfigResponse(**cfg)


@router.put("/config", response_model=RetrainingConfigResponse)
async def update_retraining_config(
    payload: UpdateRetrainingConfigRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin"]))
):
    """
    Updates MLOps model retraining settings with audit logging.
    """
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    cfg = await MLRetrainingConfigService.update_config(
        session=db,
        updates=updates,
        actor_email=user_payload.get("email", "admin"),
        actor_role=user_payload.get("role", "admin")
    )
    return RetrainingConfigResponse(**cfg)
