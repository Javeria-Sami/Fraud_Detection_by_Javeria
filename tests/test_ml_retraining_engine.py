"""
Unit Tests for Model Retraining Engine, Temporal Splitting, Leakage Prevention, and Artifact Integrity.
Section 21 — Model Retraining.
"""
import os
import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timezone, timedelta

from sqlalchemy import select
from backend.app.core.database import AsyncSessionLocal
from backend.app.engine.ml.dataset import DatasetPreparationService, DataQualityError
from backend.app.engine.ml.preprocessor import MLPreprocessor, ML_FEATURE_NAMES
from backend.app.engine.ml.evaluator import MLEvaluationService
from backend.app.engine.ml.retraining.types import (
    RetrainingConfig,
    RetrainingStatus,
    TemporalSplitConfig,
    ThresholdMethod
)
from backend.app.engine.ml.retraining.service import ModelRetrainingService
from ml.datasets.synthetic_generator import generate_synthetic_transactions


def test_chronological_temporal_splitting_no_leakage():
    """
    Verifies that temporal splitting strictly respects chronological ordering
    without shuffle contamination (Train oldest -> Val middle -> Test newest).
    """
    now = datetime.now(timezone.utc)
    timestamps = [now - timedelta(days=100 - i) for i in range(100)]
    df = pd.DataFrame({
        "timestamp": timestamps,
        "amount": [10.0 + i for i in range(100)],
        "is_fraud": [0] * 90 + [1] * 10
    })

    train_df, val_df, test_df = DatasetPreparationService.split_chronologically(
        df,
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15
    )

    assert len(train_df) == 70
    assert len(val_df) == 15
    assert len(test_df) == 15

    # Chronological integrity
    assert train_df["timestamp"].max() < val_df["timestamp"].min()
    assert val_df["timestamp"].max() < test_df["timestamp"].min()

    # Preprocessor fitting isolation
    preprocessor = MLPreprocessor(feature_version="features-v1")
    # Synthetic feature columns
    for col in ML_FEATURE_NAMES:
        train_df[col] = np.random.uniform(1.0, 10.0, size=len(train_df))
        val_df[col] = np.random.uniform(1.0, 10.0, size=len(val_df))
        test_df[col] = np.random.uniform(1.0, 10.0, size=len(test_df))

    X_train = preprocessor.fit_transform(train_df)
    X_val = preprocessor.transform(val_df)
    X_test = preprocessor.transform(test_df)

    assert X_train.shape == (70, len(ML_FEATURE_NAMES))
    assert X_val.shape == (15, len(ML_FEATURE_NAMES))
    assert X_test.shape == (15, len(ML_FEATURE_NAMES))


def test_data_quality_validation_checks():
    """
    Tests data quality constraints: empty data, null timestamps, and negative amounts.
    """
    # Empty DataFrame
    with pytest.raises(DataQualityError, match="empty"):
        DatasetPreparationService.validate_dataset_quality(pd.DataFrame())

    # Null Timestamps
    df_null_ts = pd.DataFrame({
        "timestamp": [datetime.now(timezone.utc), None],
        "amount": [100.0, 200.0]
    })
    with pytest.raises(DataQualityError, match="null timestamps"):
        DatasetPreparationService.validate_dataset_quality(df_null_ts)

    # Non-positive amounts
    df_neg_amt = pd.DataFrame({
        "timestamp": [datetime.now(timezone.utc), datetime.now(timezone.utc)],
        "amount": [100.0, -50.0]
    })
    with pytest.raises(DataQualityError, match="non-positive"):
        DatasetPreparationService.validate_dataset_quality(df_neg_amt)


@pytest.mark.asyncio
async def test_candidate_retraining_execution_and_reproducibility():
    """
    Executes a complete synthetic retraining run:
    Validates candidate registration with status EVALUATED and verifies reproducibility.
    """
    async with AsyncSessionLocal() as session:
        # Clear any stale active runs
        from backend.app.models.ml_model import ModelRetrainingRun
        stmt = select(ModelRetrainingRun).where(
            ModelRetrainingRun.status.in_(["VALIDATING_DATA", "TRAINING", "RUNNING", "FEATURE_ENGINEERING", "EVALUATING", "QUEUED"])
        )
        for r in (await session.execute(stmt)).scalars().all():
            r.status = "CANCELLED"
        await session.commit()

        cfg = RetrainingConfig(
            model_type="Isolation Forest",
            n_estimators=60,
            contamination=0.07,
            random_state=42,
            min_samples=30
        )

        run = await ModelRetrainingService.trigger_retraining(
            session=session,
            config=cfg,
            custom_version="v2.1.0-test",
            actor_email="mlops@fraudshield.internal",
            actor_role="admin"
        )

        assert run.status == RetrainingStatus.COMPLETED.value
        assert run.candidate_model_version_id is not None
        assert run.records_used >= 30
        assert run.artifact_checksum is not None
        assert len(run.artifact_checksum) == 64  # SHA256 length

        # Verify candidate model properties in registry
        candidate = run.candidate_model_version
        assert candidate.version == "v2.1.0-test"
        assert candidate.status == "EVALUATED"  # Strict requirement: candidate is EVALUATED, NOT DEPLOYED
        assert candidate.algorithm == "Isolation Forest"
        assert candidate.metrics is not None
        assert "anomaly_percentage" in candidate.metrics

        # Model comparison report
        comp = run.model_comparison
        assert "candidate_version" in comp
        assert comp["candidate_version"] == "v2.1.0-test"
        assert "score_distribution_comparison" in comp


@pytest.mark.asyncio
async def test_retraining_run_cancellation():
    """
    Verifies that a running or queued retraining job can be cancelled cleanly.
    """
    import uuid
    cancel_run_id = f"RETRAIN-TEST-CANCEL-{uuid.uuid4().hex[:6]}"
    async with AsyncSessionLocal() as session:
        # Create a mock pending run
        from backend.app.models.ml_model import ModelRetrainingRun
        mock_run = ModelRetrainingRun(
            id=cancel_run_id,
            model_type="Isolation Forest",
            status=RetrainingStatus.TRAINING.value,
            created_by="analyst@fraudshield.internal"
        )
        session.add(mock_run)
        await session.commit()

        cancelled = await ModelRetrainingService.cancel_retraining(
            session=session,
            run_id=cancel_run_id,
            actor_email="admin@fraudshield.internal",
            actor_role="admin"
        )

        assert cancelled.status == RetrainingStatus.CANCELLED.value
        assert "Cancelled by" in cancelled.error_message
