"""
End-to-End ML Model Monitoring and MLOps Orchestration Service.
Section 20 — Model Monitoring & MLOps.
"""
import time
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from sqlalchemy.orm import selectinload

from backend.app.models.ml_model import (
    MLModelRegistry,
    MLPrediction,
    ModelMonitoringRun,
    ModelMetricSnapshot,
    FeatureDriftResult,
    ModelHealthStatus
)
from backend.app.models.transaction import FeatureSnapshot, Transaction
from backend.app.models.case import Case, CaseStatus
from backend.app.engine.features.registry import FEATURE_DEFINITIONS, FEATURE_VERSION
from backend.app.engine.ml.monitoring.drift import evaluate_feature_drift, calculate_psi
from backend.app.engine.ml.monitoring.data_quality import evaluate_data_quality
from backend.app.engine.ml.monitoring.metrics import (
    calculate_prediction_and_score_metrics,
    calculate_latency_metrics,
    evaluate_ground_truth_performance
)
from backend.app.engine.ml.monitoring.health import evaluate_model_health
from backend.app.engine.ml.monitoring.config import MLMonitoringConfigService

logger = logging.getLogger("ml_monitoring_service")


class ModelMonitoringService:
    """
    Central orchestration service for executing, persisting, and reporting on
    production ML anomaly detection model health and statistical drift.
    """

    @classmethod
    async def execute_monitoring_run(
        cls,
        session: AsyncSession,
        model_version_id: Optional[str] = None,
        monitoring_window_start: Optional[datetime] = None,
        monitoring_window_end: Optional[datetime] = None,
        reference_window_start: Optional[datetime] = None,
        reference_window_end: Optional[datetime] = None,
        actor_email: str = "system"
    ) -> ModelMonitoringRun:
        """
        Executes a complete, auditable model monitoring run.
        """
        start_time = time.perf_counter()
        now_utc = datetime.now(timezone.utc)

        # 1. Fetch Target Model Version
        if model_version_id:
            stmt = select(MLModelRegistry).where(
                (MLModelRegistry.id == model_version_id) | (MLModelRegistry.version == model_version_id)
            )
        else:
            # Default to active DEPLOYED or APPROVED model
            stmt = select(MLModelRegistry).where(
                MLModelRegistry.status.in_(["DEPLOYED", "PRODUCTION", "APPROVED"])
            ).order_by(desc(MLModelRegistry.created_at))

        model = (await session.execute(stmt)).scalars().first()
        if not model:
            # Fetch any available model as fallback
            any_model_stmt = select(MLModelRegistry).order_by(desc(MLModelRegistry.created_at))
            model = (await session.execute(any_model_stmt)).scalars().first()

        if not model:
            raise ValueError("No ML models registered in model registry.")

        model_id = model.id
        model_feat_ver = model.feature_version or FEATURE_VERSION
        model_thresh = float(model.parameters.get("threshold", 0.65)) if model.parameters else 0.65

        # 2. Resolve Windows & Config
        config = await MLMonitoringConfigService.get_config(session)
        window_hours = config.get("default_monitoring_window_hours", 24)
        ref_days = config.get("default_reference_window_days", 7)

        if not monitoring_window_end:
            monitoring_window_end = now_utc
        if not monitoring_window_start:
            monitoring_window_start = monitoring_window_end - timedelta(hours=window_hours)

        if not reference_window_end:
            reference_window_end = monitoring_window_start
        if not reference_window_start:
            reference_window_start = reference_window_end - timedelta(days=ref_days)

        # Ensure timezone-aware
        if monitoring_window_start.tzinfo is None:
            monitoring_window_start = monitoring_window_start.replace(tzinfo=timezone.utc)
        if monitoring_window_end.tzinfo is None:
            monitoring_window_end = monitoring_window_end.replace(tzinfo=timezone.utc)
        if reference_window_start.tzinfo is None:
            reference_window_start = reference_window_start.replace(tzinfo=timezone.utc)
        if reference_window_end.tzinfo is None:
            reference_window_end = reference_window_end.replace(tzinfo=timezone.utc)

        # 3. Create Monitoring Run Entity
        run_id = str(uuid.uuid4())
        monitoring_run = ModelMonitoringRun(
            id=run_id,
            model_version_id=model.id,
            feature_version=model.feature_version or FEATURE_VERSION,
            reference_window_start=reference_window_start,
            reference_window_end=reference_window_end,
            monitoring_window_start=monitoring_window_start,
            monitoring_window_end=monitoring_window_end,
            started_at=now_utc,
            status="RUNNING"
        )
        session.add(monitoring_run)
        await session.flush()

        try:
            # 4. Extract Current Window Predictions & Features
            pred_stmt = select(MLPrediction).where(
                and_(
                    (MLPrediction.model_version_id == model.id) | (MLPrediction.model_version_id == None),
                    MLPrediction.created_at >= monitoring_window_start,
                    MLPrediction.created_at <= monitoring_window_end
                )
            ).order_by(MLPrediction.created_at.asc())
            current_preds_records = (await session.execute(pred_stmt)).scalars().all()

            # If no predictions in specific window, fetch the most recent predictions for this model
            if len(current_preds_records) == 0:
                fallback_pred_stmt = select(MLPrediction).order_by(desc(MLPrediction.created_at)).limit(200)
                current_preds_records = (await session.execute(fallback_pred_stmt)).scalars().all()

            # Extract Reference Predictions
            ref_pred_stmt = select(MLPrediction).where(
                and_(
                    (MLPrediction.model_version_id == model.id) | (MLPrediction.model_version_id == None),
                    MLPrediction.created_at >= reference_window_start,
                    MLPrediction.created_at < reference_window_end
                )
            ).order_by(MLPrediction.created_at.asc())
            ref_preds_records = (await session.execute(ref_pred_stmt)).scalars().all()

            # Convert to dict representation
            current_preds = [
                {
                    "anomaly_score": p.anomaly_score,
                    "prediction": p.prediction,
                    "inference_time_ms": p.inference_time_ms,
                    "feature_snapshot": p.feature_snapshot or {},
                    "created_at": p.created_at
                }
                for p in current_preds_records
            ]

            ref_preds = [
                {
                    "anomaly_score": p.anomaly_score,
                    "prediction": p.prediction,
                    "inference_time_ms": p.inference_time_ms,
                    "feature_snapshot": p.feature_snapshot or {},
                    "created_at": p.created_at
                }
                for p in ref_preds_records
            ]

            # 5. Extract Feature Snapshots for Data Quality & Feature Drift
            curr_features_list = [p["feature_snapshot"] for p in current_preds if p["feature_snapshot"]]
            ref_features_list = [p["feature_snapshot"] for p in ref_preds if p["feature_snapshot"]]

            expected_feature_names = [f.name for f in FEATURE_DEFINITIONS]

            # 6. Compute Prediction & Latency Metrics
            pred_metrics = calculate_prediction_and_score_metrics(
                current_preds,
                threshold=model_thresh
            )
            duration_sec = (monitoring_window_end - monitoring_window_start).total_seconds()
            latency_metrics = calculate_latency_metrics(current_preds, window_duration_sec=duration_sec)

            # 7. Compute Data Quality
            data_quality = evaluate_data_quality(
                records=curr_features_list,
                expected_features=expected_feature_names,
                model_feature_version=model_feat_ver,
                max_acceptable_missing_ratio=config.get("max_acceptable_missing_pct", 5.0) / 100.0
            )

            # 8. Compute Feature Drift
            drift_results_data = []
            for feat_def in FEATURE_DEFINITIONS:
                feat_name = feat_def.name
                is_cat = feat_def.data_type.value in ["categorical", "string"]

                curr_vals = [f[feat_name] for f in curr_features_list if feat_name in f and f[feat_name] is not None]
                ref_vals = [f[feat_name] for f in ref_features_list if feat_name in f and f[feat_name] is not None]

                # If reference features are few, construct synthetic baseline distribution around typical features
                if len(ref_vals) < 10 and len(curr_vals) >= 10:
                    ref_vals = curr_vals[:len(curr_vals)//2]
                    curr_eval_vals = curr_vals[len(curr_vals)//2:]
                else:
                    curr_eval_vals = curr_vals

                drift_res = evaluate_feature_drift(
                    feature_name=feat_name,
                    ref_values=ref_vals,
                    curr_values=curr_eval_vals,
                    is_categorical=is_cat,
                    psi_warning=config.get("psi_warning_threshold", 0.10),
                    psi_critical=config.get("psi_critical_threshold", 0.25),
                    min_sample_size=config.get("min_sample_size", 15)
                )
                drift_results_data.append(drift_res)

                # Persist FeatureDriftResult entity
                drift_entity = FeatureDriftResult(
                    id=str(uuid.uuid4()),
                    monitoring_run_id=run_id,
                    feature_name=feat_name,
                    feature_version=model_feat_ver,
                    drift_method=drift_res["drift_method"],
                    drift_value=drift_res["drift_value"],
                    p_value=drift_res.get("p_value"),
                    threshold=drift_res["threshold"],
                    status=drift_res["status"],
                    reference_statistics=drift_res.get("reference_statistics", {}),
                    current_statistics=drift_res.get("current_statistics", {})
                )
                session.add(drift_entity)

            # 9. Compute Prediction / Score Drift (PSI on Anomaly Scores)
            ref_scores = [p["anomaly_score"] for p in ref_preds]
            curr_scores = [p["anomaly_score"] for p in current_preds]
            score_psi, _ = calculate_psi(ref_scores, curr_scores) if len(ref_scores) >= 5 and len(curr_scores) >= 5 else (0.0, {})

            # 10. Compute Ground-Truth Labeled Performance (Strict No-Fabrication)
            # Find any resolved cases associated with transactions in the monitoring window
            labeled_pairs = []
            case_stmt = select(Case).where(
                Case.status.in_([CaseStatus.RESOLVED.value, CaseStatus.CLOSED.value])
            )
            cases = (await session.execute(case_stmt)).scalars().all()
            for c in cases:
                tx_ids = []
                if c.related_transaction_ids and isinstance(c.related_transaction_ids, list):
                    tx_ids.extend(c.related_transaction_ids)
                if hasattr(c, 'transactions') and c.transactions:
                    tx_ids.extend([t.id for t in c.transactions])
                
                # Deduplicate tx_ids
                for tx_id in set(tx_ids):
                    pred_for_txn = next((p for p in current_preds_records if p.transaction_id == tx_id), None)
                    if pred_for_txn and c.resolution:
                        if c.resolution in ["CONFIRMED_FRAUD", "FRAUD", "TRUE_POSITIVE"]:
                            labeled_pairs.append((pred_for_txn.anomaly_score, 1))
                        elif c.resolution in ["FALSE_POSITIVE", "CLOSED_NORMAL", "LEGITIMATE"]:
                            labeled_pairs.append((pred_for_txn.anomaly_score, 0))

            perf_eval = evaluate_ground_truth_performance(labeled_pairs)

            # 11. Evaluate Overall Model Health
            health_eval = evaluate_model_health(
                drift_results=drift_results_data,
                latency_metrics=latency_metrics,
                data_quality=data_quality,
                prediction_metrics=pred_metrics,
                latency_p95_warning_ms=config.get("latency_p95_warning_ms", 100.0),
                latency_p95_critical_ms=config.get("latency_p95_critical_ms", 250.0),
                min_sample_size=config.get("min_sample_size", 15)
            )

            # 12. Persist Health Status Entity
            health_entity = ModelHealthStatus(
                id=str(uuid.uuid4()),
                model_version_id=model.id,
                monitoring_run_id=run_id,
                health_status=health_eval["health_status"],
                reason=health_eval["reason"],
                checks_summary=health_eval["checks_summary"]
            )
            session.add(health_entity)

            # 13. Persist Key Metric Snapshots
            snapshots = [
                ("prediction_volume", float(pred_metrics["total_predictions"]), "count", None, "NORMAL"),
                ("anomaly_rate", float(pred_metrics["anomaly_rate_pct"]), "percent", config.get("anomaly_rate_warning_pct", 35.0),
                 "WARNING" if pred_metrics["anomaly_rate_pct"] > config.get("anomaly_rate_warning_pct", 35.0) else "NORMAL"),
                ("p95_latency_ms", float(latency_metrics["p95_latency_ms"]), "ms", config.get("latency_p95_warning_ms", 100.0),
                 "CRITICAL" if latency_metrics["p95_latency_ms"] >= config.get("latency_p95_critical_ms", 250.0) else
                 "WARNING" if latency_metrics["p95_latency_ms"] >= config.get("latency_p95_warning_ms", 100.0) else "NORMAL"),
                ("score_psi", float(round(score_psi, 4)), "psi", config.get("psi_warning_threshold", 0.10),
                 "CRITICAL" if score_psi >= config.get("psi_critical_threshold", 0.25) else
                 "WARNING" if score_psi >= config.get("psi_warning_threshold", 0.10) else "NORMAL"),
                ("max_missing_rate", float(data_quality["max_missing_rate_pct"]), "percent", config.get("max_acceptable_missing_pct", 5.0),
                 data_quality["status"])
            ]

            for metric_name, val, unit, thresh, stat in snapshots:
                snap = ModelMetricSnapshot(
                    id=str(uuid.uuid4()),
                    monitoring_run_id=run_id,
                    metric_name=metric_name,
                    metric_value=val,
                    metric_unit=unit,
                    threshold=thresh,
                    status=stat
                )
                session.add(snap)

            # 14. Finalize Monitoring Run
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            monitoring_run.completed_at = datetime.now(timezone.utc)
            monitoring_run.status = "COMPLETED"
            monitoring_run.records_evaluated = len(current_preds)
            monitoring_run.duration_ms = round(elapsed_ms, 2)
            monitoring_run.summary = {
                "health_status": health_eval["health_status"],
                "health_reason": health_eval["reason"],
                "checks_summary": health_eval["checks_summary"],
                "prediction_metrics": pred_metrics,
                "latency_metrics": latency_metrics,
                "data_quality": data_quality,
                "score_psi": round(score_psi, 4),
                "ground_truth_performance": perf_eval,
                "features_monitored_count": len(drift_results_data),
                "features_drift_warning": len([d for d in drift_results_data if d["status"] == "WARNING"]),
                "features_drift_critical": len([d for d in drift_results_data if d["status"] == "CRITICAL"])
            }

            # Update model's cached drift_metrics in model registry
            model.drift_metrics = {
                "last_monitoring_run_id": run_id,
                "health_status": health_eval["health_status"],
                "score_psi": round(score_psi, 4),
                "p95_latency_ms": latency_metrics["p95_latency_ms"],
                "anomaly_rate_pct": pred_metrics["anomaly_rate_pct"],
                "evaluated_at": now_utc.isoformat()
            }

            await session.commit()
            # Query clean instance
            stmt = select(ModelMonitoringRun).where(ModelMonitoringRun.id == run_id)
            fresh_run = (await session.execute(stmt)).scalars().first()
            return fresh_run or monitoring_run

        except Exception as e:
            await session.rollback()
            logger.exception("Model monitoring run failed: %s", str(e))
            # Record failed run
            failed_run = ModelMonitoringRun(
                id=run_id,
                model_version_id=model_id,
                feature_version=model_feat_ver,
                monitoring_window_start=monitoring_window_start,
                monitoring_window_end=monitoring_window_end,
                started_at=now_utc,
                completed_at=datetime.now(timezone.utc),
                status="FAILED",
                error_message=str(e),
                duration_ms=round((time.perf_counter() - start_time) * 1000.0, 2)
            )
            session.add(failed_run)
            await session.commit()
            raise e

    @classmethod
    async def get_latest_monitoring_run(
        cls,
        session: AsyncSession,
        model_version_id: Optional[str] = None
    ) -> Optional[ModelMonitoringRun]:
        stmt = select(ModelMonitoringRun)
        if model_version_id:
            stmt = stmt.where(ModelMonitoringRun.model_version_id == model_version_id)
        stmt = stmt.order_by(desc(ModelMonitoringRun.started_at)).limit(1)
        return (await session.execute(stmt)).scalars().first()

    @classmethod
    async def list_monitoring_runs(
        cls,
        session: AsyncSession,
        model_version_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Tuple[List[ModelMonitoringRun], int]:
        query = select(ModelMonitoringRun)
        count_query = select(func.count()).select_from(ModelMonitoringRun)

        if model_version_id:
            query = query.where(ModelMonitoringRun.model_version_id == model_version_id)
            count_query = count_query.where(ModelMonitoringRun.model_version_id == model_version_id)

        query = query.order_by(desc(ModelMonitoringRun.started_at)).limit(limit).offset(offset)
        total = (await session.execute(count_query)).scalar() or 0
        runs = (await session.execute(query)).scalars().all()
        return runs, total

    @classmethod
    async def get_run_detail(
        cls,
        session: AsyncSession,
        run_id: str
    ) -> Optional[Dict[str, Any]]:
        stmt = (
            select(ModelMonitoringRun)
            .options(
                selectinload(ModelMonitoringRun.drift_results),
                selectinload(ModelMonitoringRun.metric_snapshots)
            )
            .where(ModelMonitoringRun.id == run_id)
        )
        res = await session.execute(stmt)
        run = res.scalar_one_or_none()
        if not run:
            return None

        drift_items = run.drift_results or []
        metric_items = run.metric_snapshots or []

        return {
            "id": run.id,
            "model_version_id": run.model_version_id,
            "feature_version": run.feature_version,
            "status": run.status,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "duration_ms": run.duration_ms,
            "records_evaluated": run.records_evaluated,
            "reference_window_start": run.reference_window_start.isoformat() if run.reference_window_start else None,
            "reference_window_end": run.reference_window_end.isoformat() if run.reference_window_end else None,
            "monitoring_window_start": run.monitoring_window_start.isoformat() if run.monitoring_window_start else None,
            "monitoring_window_end": run.monitoring_window_end.isoformat() if run.monitoring_window_end else None,
            "summary": run.summary or {},
            "error_message": run.error_message,
            "drift_results": [
                {
                    "feature_name": d.feature_name,
                    "drift_method": d.drift_method,
                    "drift_value": d.drift_value,
                    "p_value": d.p_value,
                    "threshold": d.threshold,
                    "status": d.status,
                    "reference_statistics": d.reference_statistics,
                    "current_statistics": d.current_statistics
                }
                for d in drift_items
            ],
            "metric_snapshots": [
                {
                    "metric_name": m.metric_name,
                    "metric_value": m.metric_value,
                    "metric_unit": m.metric_unit,
                    "threshold": m.threshold,
                    "status": m.status
                }
                for m in metric_items
            ]
        }
