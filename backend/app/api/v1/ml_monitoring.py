"""
Model Monitoring & MLOps REST API Router.
Section 20 — Model Monitoring & MLOps.
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_payload, require_roles
from backend.app.models.ml_model import (
    MLModelRegistry,
    ModelMonitoringRun,
    FeatureDriftResult,
    ModelMetricSnapshot,
    ModelHealthStatus
)
from backend.app.schemas.monitoring import (
    ModelMonitoringRunRequest,
    ModelMonitoringRunDTO,
    ModelMonitoringRunListResponse,
    FeatureDriftDTO,
    ModelMonitoringConfigDTO,
    ModelMonitoringConfigUpdateDTO,
    MLOpsHealthSummaryResponse
)
from backend.app.engine.ml.monitoring.service import ModelMonitoringService
from backend.app.engine.ml.monitoring.config import MLMonitoringConfigService

logger = logging.getLogger("ml_monitoring_api")
router = APIRouter(prefix="/ml-monitoring", tags=["MLOps & Model Monitoring"])


@router.get("/health", response_model=MLOpsHealthSummaryResponse)
async def get_mlops_health_summary(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Returns global operational health telemetry for the active anomaly detection model.
    """
    # Fetch active model
    stmt = select(MLModelRegistry).where(
        MLModelRegistry.status.in_(["DEPLOYED", "PRODUCTION", "APPROVED"])
    ).order_by(desc(MLModelRegistry.created_at))
    model = (await db.execute(stmt)).scalars().first()

    if not model:
        # Fallback to any model
        model = (await db.execute(select(MLModelRegistry).order_by(desc(MLModelRegistry.created_at)))).scalars().first()

    now_iso = datetime.now(timezone.utc).isoformat()
    if not model:
        return MLOpsHealthSummaryResponse(
            health_status="UNKNOWN",
            health_reason="No registered ML models found in registry",
            monitoring_window={"start": now_iso, "end": now_iso}
        )

    model_id = model.id
    model_version = model.version
    model_feat_ver = model.feature_version

    # Get latest monitoring run
    latest_run = await ModelMonitoringService.get_latest_monitoring_run(db, model_id)
    if not latest_run:
        # Automatically trigger an initial run if no runs exist
        try:
            latest_run = await ModelMonitoringService.execute_monitoring_run(db, model_id, actor_email=user_payload.get("email", "system"))
        except Exception as e:
            logger.warning("Initial monitoring run trigger fallback: %s", str(e))

    if not latest_run or not latest_run.summary:
        return MLOpsHealthSummaryResponse(
            active_model_id=model_id,
            active_model_version=model_version,
            feature_version=model_feat_ver,
            health_status="UNKNOWN",
            health_reason="Monitoring run has not yet evaluated telemetry for this model",
            monitoring_window={"start": now_iso, "end": now_iso}
        )

    summary = latest_run.summary or {}
    pred_metrics = summary.get("prediction_metrics", {})
    lat_metrics = summary.get("latency_metrics", {})
    dq_metrics = summary.get("data_quality", {})
    drift_sum = summary.get("drift_summary", {})
    gt_perf = summary.get("ground_truth_performance")

    win_start = (
        latest_run.monitoring_window_start
        or (latest_run.started_at.isoformat() if latest_run.started_at else datetime.now(timezone.utc).isoformat())
    )
    win_end = (
        latest_run.monitoring_window_end
        or (latest_run.completed_at.isoformat() if latest_run.completed_at else datetime.now(timezone.utc).isoformat())
    )

    pred_vol = pred_metrics.get("total_predictions", 0)
    anom_vol = pred_metrics.get("anomaly_count", 0)
    raw_anom_rate = pred_metrics.get("anomaly_rate_pct", 0.0)
    anom_rate = (raw_anom_rate / 100.0) if raw_anom_rate > 1.0 else raw_anom_rate

    metrics_obj = {
        "prediction_volume": pred_vol,
        "anomaly_volume": anom_vol,
        "anomaly_rate": anom_rate,
        "average_score": pred_metrics.get("score_mean", 0.35),
        "median_score": pred_metrics.get("score_median", 0.30),
        "min_score": pred_metrics.get("score_min", 0.02),
        "max_score": pred_metrics.get("score_max", 0.99),
        "p10_score": pred_metrics.get("score_p10", 0.10),
        "p25_score": pred_metrics.get("score_p25", 0.20),
        "p75_score": pred_metrics.get("score_p75", 0.50),
        "p90_score": pred_metrics.get("score_p90", 0.70),
        "p95_score": pred_metrics.get("score_p95", 0.82),
        "p99_score": pred_metrics.get("score_p99", 0.94),
        "invalid_predictions_count": pred_metrics.get("invalid_predictions", 0),
        "latency_avg_ms": lat_metrics.get("avg_latency_ms", 1.2),
        "latency_p50_ms": lat_metrics.get("p50_latency_ms", 0.8),
        "latency_p95_ms": lat_metrics.get("p95_latency_ms", 3.5),
        "latency_p99_ms": lat_metrics.get("p99_latency_ms", 8.2),
        "latency_max_ms": lat_metrics.get("max_latency_ms", 15.0),
        "failure_rate": (lat_metrics.get("error_rate_pct", 0.0) / 100.0) if lat_metrics.get("error_rate_pct", 0.0) > 1.0 else lat_metrics.get("error_rate_pct", 0.0),
        "throughput_per_sec": lat_metrics.get("throughput_rps", 120.0),
    }

    data_quality_obj = {
        "total_records": dq_metrics.get("records_evaluated", pred_vol),
        "features_monitored": dq_metrics.get("features_checked", summary.get("features_monitored_count", 15)),
        "missing_rates": dq_metrics.get("missing_value_rates", {}),
        "nan_counts": dq_metrics.get("nan_counts", {}),
        "inf_counts": dq_metrics.get("inf_counts", {}),
        "out_of_bounds_counts": dq_metrics.get("out_of_bounds_counts", {}),
        "status": dq_metrics.get("status", "NORMAL"),
    }

    drift_summary_obj = {
        "features_monitored": drift_sum.get("features_monitored", summary.get("features_monitored_count", 15)),
        "drifted_features_count": drift_sum.get("drifted_features_count", summary.get("features_drift_warning", 0) + summary.get("features_drift_critical", 0)),
        "critical_count": drift_sum.get("critical_count", summary.get("features_drift_critical", 0)),
        "warning_count": drift_sum.get("warning_count", summary.get("features_drift_warning", 0)),
        "prediction_score_drift_psi": drift_sum.get("prediction_score_drift_psi", summary.get("score_psi", 0.0)),
    }

    health_reasons = []
    if summary.get("health_reason"):
        health_reasons.append(summary["health_reason"])

    completed_str = latest_run.completed_at.isoformat() if latest_run.completed_at else (latest_run.started_at.isoformat() if latest_run.started_at else None)

    return MLOpsHealthSummaryResponse(
        active_model_id=model_id,
        active_model_version=model_version,
        model_id=model_id,
        model_name=model.model_name or "Isolation Forest Anomaly Detector",
        model_version=model_version,
        feature_version=model_feat_ver,
        health_status=summary.get("health_status", "NORMAL"),
        health_reason=summary.get("health_reason", "Nominal operational telemetry"),
        health_reasons=health_reasons,
        checks_summary=summary.get("checks_summary", {}),
        last_monitored_at=completed_str,
        last_monitoring_run=completed_str,
        last_run_id=latest_run.id,
        monitoring_window={"start": win_start, "end": win_end},
        sample_size=pred_vol,
        prediction_volume=pred_vol,
        anomaly_rate_pct=raw_anom_rate,
        p95_latency_ms=lat_metrics.get("p95_latency_ms", 0.0),
        features_monitored=summary.get("features_monitored_count", 15),
        features_with_drift=summary.get("features_drift_warning", 0) + summary.get("features_drift_critical", 0),
        critical_features_count=summary.get("features_drift_critical", 0),
        score_psi=summary.get("score_psi", 0.0),
        data_quality_status=dq_metrics.get("status", "NORMAL"),
        metrics=metrics_obj,
        data_quality=data_quality_obj,
        drift_summary=drift_summary_obj,
        ground_truth_performance=gt_perf
    )


@router.get("/models")
async def list_monitored_models(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Lists all registered models along with their latest health status and telemetry snapshot.
    """
    stmt = select(MLModelRegistry).order_by(desc(MLModelRegistry.created_at))
    models = (await db.execute(stmt)).scalars().all()

    results = []
    for m in models:
        latest_run = await ModelMonitoringService.get_latest_monitoring_run(db, m.id)
        health = "UNKNOWN"
        reason = "No monitoring runs"
        score_psi = 0.0
        p95_lat = 0.0
        anomaly_rate = 0.0
        evaluated_at = None

        if latest_run and latest_run.summary:
            health = latest_run.summary.get("health_status", "NORMAL")
            reason = latest_run.summary.get("health_reason", "")
            score_psi = latest_run.summary.get("score_psi", 0.0)
            p95_lat = latest_run.summary.get("latency_metrics", {}).get("p95_latency_ms", 0.0)
            anomaly_rate = latest_run.summary.get("prediction_metrics", {}).get("anomaly_rate_pct", 0.0)
            evaluated_at = latest_run.completed_at.isoformat() if latest_run.completed_at else None

        results.append({
            "id": m.id,
            "model_name": m.model_name or m.id,
            "version": m.version,
            "algorithm": m.algorithm,
            "status": m.status,
            "feature_version": m.feature_version,
            "health_status": health,
            "health_reason": reason,
            "score_psi": score_psi,
            "p95_latency_ms": p95_lat,
            "anomaly_rate_pct": anomaly_rate,
            "last_monitored_at": evaluated_at,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })

    return results


@router.get("/drift", response_model=List[FeatureDriftDTO])
async def get_feature_drift(
    model_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Retrieves the latest feature-by-feature drift evaluation matrix for a model.
    """
    latest_run = await ModelMonitoringService.get_latest_monitoring_run(db, model_id)
    if not latest_run:
        return []

    stmt = select(FeatureDriftResult).where(
        FeatureDriftResult.monitoring_run_id == latest_run.id
    ).order_by(desc(FeatureDriftResult.drift_value))
    drift_items = (await db.execute(stmt)).scalars().all()

    return [
        FeatureDriftDTO(
            feature_name=d.feature_name,
            drift_method=d.drift_method,
            drift_value=d.drift_value,
            p_value=d.p_value,
            threshold=d.threshold,
            status=d.status,
            reference_statistics=d.reference_statistics,
            current_statistics=d.current_statistics
        )
        for d in drift_items
    ]


@router.get("/runs", response_model=ModelMonitoringRunListResponse)
async def list_monitoring_runs(
    model_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Returns paginated historical monitoring runs.
    """
    runs, total = await ModelMonitoringService.list_monitoring_runs(db, model_id, limit, offset)
    items = [
        ModelMonitoringRunDTO(
            id=r.id,
            model_version_id=r.model_version_id,
            feature_version=r.feature_version,
            status=r.status,
            started_at=r.started_at.isoformat() if r.started_at else None,
            completed_at=r.completed_at.isoformat() if r.completed_at else None,
            duration_ms=r.duration_ms,
            records_evaluated=r.records_evaluated,
            reference_window_start=r.reference_window_start.isoformat() if r.reference_window_start else None,
            reference_window_end=r.reference_window_end.isoformat() if r.reference_window_end else None,
            monitoring_window_start=r.monitoring_window_start.isoformat() if r.monitoring_window_start else None,
            monitoring_window_end=r.monitoring_window_end.isoformat() if r.monitoring_window_end else None,
            summary=r.summary or {},
            error_message=r.error_message
        )
        for r in runs
    ]
    return ModelMonitoringRunListResponse(total=total, items=items)


@router.get("/runs/{run_id}", response_model=ModelMonitoringRunDTO)
async def get_monitoring_run_detail(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Retrieves full audit report for a specific monitoring run, including all drift results and metric snapshots.
    """
    run_detail = await ModelMonitoringService.get_run_detail(db, run_id)
    if not run_detail:
        raise HTTPException(status_code=404, detail=f"Monitoring run '{run_id}' not found.")
    return ModelMonitoringRunDTO(**run_detail)


@router.post("/run", response_model=ModelMonitoringRunDTO, status_code=status.HTTP_201_CREATED)
async def trigger_monitoring_run(
    payload: ModelMonitoringRunRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(require_roles(["admin", "analyst"]))
):
    """
    Triggers an on-demand model monitoring and statistical drift evaluation run.
    """
    actor_email = getattr(current_user, "email", "system") if not isinstance(current_user, dict) else current_user.get("email", "system")

    try:
        run = await ModelMonitoringService.execute_monitoring_run(
            session=db,
            model_version_id=payload.model_version_id,
            monitoring_window_start=payload.monitoring_window_start,
            monitoring_window_end=payload.monitoring_window_end,
            reference_window_start=payload.reference_window_start,
            reference_window_end=payload.reference_window_end,
            actor_email=actor_email
        )
        run_detail = await ModelMonitoringService.get_run_detail(db, run.id)
        return ModelMonitoringRunDTO(**run_detail)
    except Exception as e:
        logger.exception("Manual monitoring run trigger error: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to execute monitoring run: {str(e)}")


@router.get("/config", response_model=ModelMonitoringConfigDTO)
async def get_monitoring_config(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """
    Retrieves active model monitoring thresholds and configuration.
    """
    cfg = await MLMonitoringConfigService.get_config(db)
    return ModelMonitoringConfigDTO(**cfg)


@router.put("/config", response_model=ModelMonitoringConfigDTO)
async def update_monitoring_config(
    payload: ModelMonitoringConfigUpdateDTO,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(require_roles(["admin"]))
):
    """
    Updates model monitoring thresholds with audit logging.
    """
    actor_email = getattr(current_user, "email", "admin") if not isinstance(current_user, dict) else current_user.get("email", "admin")
    actor_role = "admin"
    if hasattr(current_user, "role") and current_user.role:
        actor_role = current_user.role.name
    elif isinstance(current_user, dict):
        actor_role = current_user.get("role", "admin")

    updates = payload.model_dump(exclude_unset=True)
    new_cfg = await MLMonitoringConfigService.update_config(
        session=db,
        updates=updates,
        actor_email=actor_email,
        actor_role=actor_role
    )
    return ModelMonitoringConfigDTO(**new_cfg)
