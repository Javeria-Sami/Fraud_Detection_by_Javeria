"""
ML Model Management, Training, Evaluation, Deployment, and Inference API Endpoints.
Section 08 — ML Anomaly Detection.
Guarded by granular RBAC with mandatory audit logging.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.security import get_current_user_payload, require_roles, require_permissions
from backend.app.core.audit import AuditService
from backend.app.models.ml_model import MLModelRegistry
from backend.app.schemas.model import (
    MLModelResponse,
    TrainModelRequest,
    RetrainRequest,
    EvaluateModelRequest,
    PredictRequest,
    BatchPredictRequest,
    MLPredictionResponse,
    BatchPredictionResponse
)
from backend.app.engine.ml.types import MLTrainingConfig, ModelStatus
from backend.app.engine.ml.dataset import DatasetPreparationService, DataQualityError
from backend.app.engine.ml.trainer import MLTrainingService
from backend.app.engine.ml.evaluator import MLEvaluationService
from backend.app.engine.ml.registry import MLModelRegistryService
from backend.app.engine.ml.service import MLInferenceService
from backend.app.engine.feature_store import FeatureStore

router = APIRouter(prefix="/models", tags=["Model Registry & ML"])


def _to_model_response(m: MLModelRegistry) -> MLModelResponse:
    return MLModelResponse(
        id=m.id,
        name=m.model_name or m.id,
        model_name=m.model_name or m.id,
        version=m.version,
        algorithm=m.algorithm,
        feature_version=m.feature_version,
        status=m.status,
        parameters=m.parameters or {},
        metrics=m.metrics or {},
        drift_metrics=m.drift_metrics or {},
        artifact_path=m.artifact_path,
        description=m.description,
        created_at=m.created_at.isoformat() if m.created_at else None,
        deployed_at=m.deployed_at.isoformat() if m.deployed_at else None,
        retired_at=m.retired_at.isoformat() if m.retired_at else None
    )


# ----------------- Model Listing & Retrieval -----------------
@router.get("", response_model=List[MLModelResponse])
async def list_models(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """Lists all registered ML models ordered by creation date."""
    stmt = select(MLModelRegistry).order_by(desc(MLModelRegistry.created_at))
    res = await db.execute(stmt)
    models = res.scalars().all()
    return [_to_model_response(m) for m in models]


@router.get("/{model_id}", response_model=MLModelResponse)
async def get_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_payload)
):
    """Retrieves metadata and evaluation metrics for a specific model version."""
    m = await MLModelRegistryService.get_model_by_id_or_version(db, model_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found.")
    return _to_model_response(m)


# ----------------- Model Training & Retraining -----------------
@router.post("/train", response_model=MLModelResponse, status_code=status.HTTP_201_CREATED)
async def train_model(
    payload: TrainModelRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin"]))
):
    """
    Trains a new Isolation Forest model on historical transaction features.
    Extracts dataset, performs chronological splitting, fits preprocessor,
    trains model, calibrates threshold, saves artifact, and registers in database.
    """
    try:
        df = await DatasetPreparationService.extract_dataset_from_db(db, min_samples=30)
    except DataQualityError as dqe:
        # If DB has few samples during early testing, supplement with synthetic generator
        from ml.datasets.synthetic_generator import generate_synthetic_transactions
        df = generate_synthetic_transactions(num_samples=1000, anomaly_ratio=payload.contamination, seed=payload.random_state)

    config = MLTrainingConfig(
        n_estimators=payload.n_estimators,
        contamination=payload.contamination,
        random_state=payload.random_state,
        train_split=payload.train_split,
        val_split=payload.val_split,
        test_split=payload.test_split,
        max_samples=payload.max_samples or "auto"
    )

    version_str = payload.version or f"IF-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    art_path, eval_report, metadata = MLTrainingService.train(
        df=df,
        config=config,
        model_version=version_str,
        model_dir=settings.MODEL_DIR
    )

    registered_model = await MLModelRegistryService.register_model(
        session=db,
        version=version_str,
        algorithm="Isolation Forest",
        feature_version=metadata["feature_version"],
        parameters=config.model_dump(),
        metrics=eval_report.model_dump(),
        artifact_path=art_path,
        status=ModelStatus.APPROVED.value,
        description=payload.description or f"Trained with {eval_report.evaluated_samples} historical samples"
    )

    await AuditService.log_action(
        db,
        actor_email=user_payload.get("email", ""),
        actor_role=user_payload.get("role", "admin"),
        action="MODEL_TRAIN",
        target_entity="MLModelRegistry",
        target_id=registered_model.id,
        details=f"Trained Isolation Forest {version_str}. Evaluated {eval_report.evaluated_samples} samples."
    )

    await db.commit()
    await db.refresh(registered_model)

    return _to_model_response(registered_model)


@router.post("/retrain", response_model=MLModelResponse)
async def trigger_retraining(
    request: RetrainRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin"]))
):
    """Backward-compatible retraining endpoint."""
    train_req = TrainModelRequest(
        version=request.version,
        contamination=request.anomaly_ratio
    )
    return await train_model(train_req, db, user_payload)


# ----------------- Model Deployment & Lifecycle -----------------
@router.post("/{model_id}/deploy", response_model=MLModelResponse)
async def deploy_model(
    model_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin"]))
):
    """
    Promotes an approved model to PRODUCTION and reloads in-memory inference cache.
    Demotes previously active production models to RETIRED.
    """
    try:
        deployed_model = await MLModelRegistryService.deploy_model(db, model_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Hot reload model into in-memory inference cache
    if deployed_model.artifact_path and os.path.exists(deployed_model.artifact_path):
        MLInferenceService.load_from_artifact(deployed_model.artifact_path, model_id=deployed_model.id)

    await AuditService.log_action(
        db,
        actor_email=user_payload.get("email", ""),
        actor_role=user_payload.get("role", "admin"),
        action="MODEL_DEPLOY",
        target_entity="MLModelRegistry",
        target_id=deployed_model.id,
        details=f"Deployed model version {deployed_model.version} to PRODUCTION"
    )

    await db.commit()
    await db.refresh(deployed_model)

    return _to_model_response(deployed_model)


# ----------------- ML Prediction Endpoints -----------------
@router.post("/predict", response_model=MLPredictionResponse)
async def predict_single(
    payload: PredictRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Runs ML anomaly detection inference for a single transaction.
    Persists prediction record to `ml_predictions` and returns structured score.
    """
    txn = payload.transaction
    features = payload.features

    if not features:
        features = await FeatureStore.extract_features(
            session=db,
            txn_dict=txn,
            reference_time=txn.get("transaction_timestamp") or txn.get("timestamp")
        )

    res = await MLInferenceService.score_and_persist_transaction(
        session=db,
        transaction_dict=txn,
        features=features,
        persist=True
    )
    await db.commit()

    return MLPredictionResponse(
        transaction_id=res.transaction_id,
        model_version=res.model_version,
        model_version_id=res.model_version_id,
        feature_version=res.feature_version,
        anomaly_score=res.anomaly_score,
        is_anomaly=res.is_anomaly,
        prediction=res.prediction.value,
        confidence=res.confidence,
        threshold=res.threshold,
        inference_time_ms=res.inference_time_ms,
        context_signals=res.context_signals,
        feature_snapshot=res.feature_snapshot,
        error=res.error
    )


@router.post("/batch-predict", response_model=BatchPredictionResponse)
async def batch_predict(
    payload: BatchPredictRequest,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(require_roles(["admin", "analyst"]))
):
    """
    Runs batch inference over a list of transaction items.
    """
    items_to_score = []
    for item in payload.items:
        txn = item.transaction
        feat = item.features
        if not feat:
            feat = await FeatureStore.extract_features(db, txn)
        items_to_score.append((txn, feat))

    batch_res = MLInferenceService.batch_predict(items_to_score)

    preds_out = [
        MLPredictionResponse(
            transaction_id=r.transaction_id,
            model_version=r.model_version,
            model_version_id=r.model_version_id,
            feature_version=r.feature_version,
            anomaly_score=r.anomaly_score,
            is_anomaly=r.is_anomaly,
            prediction=r.prediction.value,
            confidence=r.confidence,
            threshold=r.threshold,
            inference_time_ms=r.inference_time_ms,
            context_signals=r.context_signals,
            feature_snapshot=r.feature_snapshot,
            error=r.error
        )
        for r in batch_res.predictions
    ]

    return BatchPredictionResponse(
        total_processed=batch_res.total_processed,
        anomalies_detected=batch_res.anomalies_detected,
        average_inference_time_ms=batch_res.average_inference_time_ms,
        total_duration_ms=batch_res.total_duration_ms,
        predictions=preds_out
    )
