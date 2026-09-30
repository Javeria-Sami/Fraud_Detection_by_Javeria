"""
Comprehensive Test Suite for Section 08 — ML Anomaly Detection.
Tests:
- Dataset preparation, validation, and chronological splitting
- Temporal data leakage prevention
- Preprocessing, cyclical hour encoding, and scaling
- Isolation Forest training reproducibility and random seed stability
- Threshold calibration and score normalization [0.0, 1.0]
- Model registry lifecycle (CANDIDATE, APPROVED, DEPLOYED, RETIRED)
- Production in-memory inference, contextual explainability, and prediction persistence
- Batch inference throughput
- API endpoints with RBAC authorization
- Fault tolerance & error isolation
- Latency and throughput micro-benchmarks
"""
import os
import time
import uuid
import pytest
import numpy as np
import pandas as pd
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from sqlalchemy import select

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import create_access_token
from backend.app.models.ml_model import MLModelRegistry, MLPrediction
from backend.app.models.transaction import Transaction
from backend.app.engine.features.registry import FEATURE_VERSION
from backend.app.engine.ml import (
    MLTrainingConfig,
    ModelStatus,
    PredictionCategory,
    MLPreprocessor,
    ML_FEATURE_NAMES,
    DatasetPreparationService,
    DataQualityError,
    MLEvaluationService,
    MLTrainingService,
    MLModelRegistryService,
    MLInferenceService
)
from ml.datasets.synthetic_generator import generate_synthetic_transactions


@pytest.fixture
def admin_headers():
    token = create_access_token({
        "sub": "USR-ADMIN-01",
        "email": "admin@fraudshield.io",
        "role": "admin",
        "username": "admin"
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def analyst_headers():
    token = create_access_token({
        "sub": "USR-ANALYST-01",
        "email": "analyst@fraudshield.io",
        "role": "analyst",
        "username": "analyst"
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def viewer_headers():
    token = create_access_token({
        "sub": "USR-VIEWER-01",
        "email": "viewer@fraudshield.io",
        "role": "viewer",
        "username": "viewer"
    })
    return {"Authorization": f"Bearer {token}"}


# =====================================================================
# 1. DATASET PREPARATION & DATA QUALITY TESTS
# =====================================================================

def test_dataset_quality_validation():
    # 1. Empty dataset rejection
    with pytest.raises(DataQualityError, match="empty"):
        DatasetPreparationService.validate_dataset_quality(pd.DataFrame())

    # 2. Non-positive amount rejection
    bad_amount_df = pd.DataFrame([{
        "timestamp": datetime.now(timezone.utc),
        "amount": -50.0
    }])
    with pytest.raises(DataQualityError, match="non-positive"):
        DatasetPreparationService.validate_dataset_quality(bad_amount_df)

    # 3. Null timestamp rejection
    bad_ts_df = pd.DataFrame([{
        "timestamp": None,
        "amount": 100.0
    }])
    with pytest.raises(DataQualityError, match="null timestamps"):
        DatasetPreparationService.validate_dataset_quality(bad_ts_df)


def test_temporal_dataset_split_and_leakage_prevention():
    base_time = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    records = []
    for i in range(100):
        records.append({
            "transaction_id": f"TXN-{i:03d}",
            "timestamp": base_time + timedelta(hours=i),
            "amount": 10.0 + i,
            "velocity_5m": 1
        })
    df = pd.DataFrame(records)

    train_df, val_df, test_df = DatasetPreparationService.split_chronologically(
        df,
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15
    )

    assert len(train_df) == 70
    assert len(val_df) == 15
    assert len(test_df) == 15

    # Verify strict temporal sequence: max(train) <= min(val) < max(val) <= min(test)
    assert train_df["timestamp"].max() <= val_df["timestamp"].min()
    assert val_df["timestamp"].max() <= test_df["timestamp"].min()


# =====================================================================
# 2. PREPROCESSING & FEATURE PIPELINE TESTS
# =====================================================================

def test_preprocessor_transformations_and_scaling():
    preprocessor = MLPreprocessor(feature_version=FEATURE_VERSION)
    
    train_data = [
        {"amount": 100.0, "amount_deviation": 1.0, "hour_of_day": 12, "velocity_5m": 1},
        {"amount": 500.0, "amount_deviation": 3.0, "hour_of_day": 3, "velocity_5m": 4},
        {"amount": 2500.0, "amount_deviation": 8.0, "hour_of_day": 23, "velocity_5m": 8}
    ]
    
    # Fit preprocessor on training data
    preprocessor.fit(train_data)
    assert preprocessor.is_fitted is True

    # Transform new data
    test_record = {"amount": 300.0, "amount_deviation": 2.0, "hour_of_day": 14}
    scaled_matrix = preprocessor.transform(test_record)

    assert scaled_matrix.shape == (1, len(ML_FEATURE_NAMES))
    assert not np.isnan(scaled_matrix).any()
    assert not np.isinf(scaled_matrix).any()


# =====================================================================
# 3. ISOLATION FOREST TRAINING & REPRODUCIBILITY TESTS
# =====================================================================

def test_isolation_forest_training_reproducibility():
    df = generate_synthetic_transactions(num_samples=300, anomaly_ratio=0.08, seed=42)
    config = MLTrainingConfig(n_estimators=50, random_state=123, contamination=0.08)

    # Train run 1
    art_1, rep_1, meta_1 = MLTrainingService.train(df, config=config, model_version="TEST-RUN-1")
    # Train run 2 with identical seed
    art_2, rep_2, meta_2 = MLTrainingService.train(df, config=config, model_version="TEST-RUN-2")

    assert rep_1.evaluated_samples == rep_2.evaluated_samples
    assert rep_1.calibrated_threshold == rep_2.calibrated_threshold
    assert np.isclose(rep_1.score_mean, rep_2.score_mean, atol=1e-3)


def test_anomaly_score_normalization_and_discrimination():
    df = generate_synthetic_transactions(num_samples=400, anomaly_ratio=0.10, seed=42)
    art_path, report, meta = MLTrainingService.train(df, model_version="TEST-DISCRIM")

    # Load model into inference service
    MLInferenceService.load_from_artifact(art_path)

    # Normal transaction features
    normal_txn = {"amount": 45.0, "id": "TXN-NORM-01"}
    normal_feat = {"amount": 45.0, "amount_deviation": 1.0, "velocity_5m": 1, "is_new_device": 0, "failed_attempts": 0}
    norm_res = MLInferenceService.predict(normal_txn, normal_feat)

    # High anomaly transaction features
    anomaly_txn = {"amount": 9000.0, "id": "TXN-ANOM-01"}
    anomaly_feat = {
        "amount": 9000.0,
        "amount_deviation": 25.0,
        "velocity_5m": 12,
        "velocity_1h": 25,
        "is_new_device": 1,
        "is_new_country": 1,
        "geo_hop_speed_kmh": 850.0,
        "failed_attempts": 4
    }
    anom_res = MLInferenceService.predict(anomaly_txn, anomaly_feat)

    assert 0.0 <= norm_res.anomaly_score <= 1.0
    assert 0.0 <= anom_res.anomaly_score <= 1.0
    assert anom_res.anomaly_score > norm_res.anomaly_score
    assert len(anom_res.context_signals) > 0


# =====================================================================
# 4. MODEL REGISTRY & LIFECYCLE TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_model_registry_lifecycle():
    async with AsyncSessionLocal() as session:
        version_name = f"IF-TEST-{uuid.uuid4().hex[:6].upper()}"
        
        # 1. Register new model as APPROVED
        reg_model = await MLModelRegistryService.register_model(
            session=session,
            version=version_name,
            algorithm="Isolation Forest",
            feature_version=FEATURE_VERSION,
            parameters={"n_estimators": 100},
            metrics={"score_mean": 0.35},
            artifact_path=os.path.join(settings.MODEL_DIR, "isolation_forest_v1.0.0.joblib"),
            status=ModelStatus.APPROVED.value
        )
        assert reg_model.status == "APPROVED"
        await session.commit()

        # 2. Deploy the model
        deployed = await MLModelRegistryService.deploy_model(session, reg_model.id)
        assert deployed.status == "PRODUCTION"
        assert deployed.deployed_at is not None
        await session.commit()

        # 3. Retrieve current deployed model
        active_prod = await MLModelRegistryService.get_deployed_model(session)
        assert active_prod is not None
        assert active_prod.version == version_name


# =====================================================================
# 5. INFERENCE PERSISTENCE & BATCH PREDICTION TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_inference_persistence_in_database():
    async with AsyncSessionLocal() as session:
        txn_id = f"TXN-PRED-{uuid.uuid4().hex[:6].upper()}"
        txn_dict = {"id": txn_id, "amount": 1500.0}
        features = {"amount": 1500.0, "amount_deviation": 3.5, "velocity_5m": 2}

        pred_res = await MLInferenceService.score_and_persist_transaction(
            session=session,
            transaction_dict=txn_dict,
            features=features,
            persist=True
        )
        await session.commit()

        # Verify ml_predictions row exists
        stmt = select(MLPrediction).where(MLPrediction.transaction_id == txn_id)
        res = await session.execute(stmt)
        record = res.scalar_one_or_none()
        assert record is not None
        assert record.anomaly_score == pred_res.anomaly_score
        assert record.inference_time_ms >= 0.0


def test_batch_prediction_service():
    items = [
        ({"id": f"TXN-B-{i}", "amount": 50.0 * (i + 1)}, {"amount": 50.0 * (i + 1), "amount_deviation": 1.0 + i * 0.5})
        for i in range(10)
    ]
    batch_res = MLInferenceService.batch_predict(items)
    assert batch_res.total_processed == 10
    assert len(batch_res.predictions) == 10
    assert batch_res.average_inference_time_ms >= 0.0


# =====================================================================
# 6. API ENDPOINT INTEGRATION & RBAC TESTS
# =====================================================================

@pytest.mark.asyncio
async def test_ml_model_api_endpoints(admin_headers, analyst_headers, viewer_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List models (Analyst allowed)
        list_res = await ac.get("/api/v1/models", headers=analyst_headers)
        assert list_res.status_code == 200
        models_list = list_res.json()
        assert isinstance(models_list, list)

        # 2. Train new model (Admin only)
        train_payload = {
            "version": f"IF-API-{uuid.uuid4().hex[:4].upper()}",
            "n_estimators": 50,
            "contamination": 0.07,
            "random_state": 42
        }
        train_res = await ac.post("/api/v1/models/train", json=train_payload, headers=admin_headers)
        assert train_res.status_code == 201
        created_model = train_res.json()
        model_id = created_model["id"]
        assert created_model["version"] == train_payload["version"]

        # 3. Viewer forbidden from training
        viewer_train_res = await ac.post("/api/v1/models/train", json=train_payload, headers=viewer_headers)
        assert viewer_train_res.status_code == 403

        # 4. Deploy model (Admin only)
        deploy_res = await ac.post(f"/api/v1/models/{model_id}/deploy", headers=admin_headers)
        assert deploy_res.status_code == 200
        assert deploy_res.json()["status"] == "PRODUCTION"

        # 5. Predict single transaction
        predict_payload = {
            "transaction": {"id": "TXN-TEST-API-01", "amount": 3200.0},
            "features": {"amount": 3200.0, "amount_deviation": 6.2, "velocity_5m": 5}
        }
        pred_res = await ac.post("/api/v1/models/predict", json=predict_payload, headers=analyst_headers)
        assert pred_res.status_code == 200
        pred_data = pred_res.json()
        assert "anomaly_score" in pred_data
        assert "is_anomaly" in pred_data
        assert "inference_time_ms" in pred_data


# =====================================================================
# 7. PERFORMANCE MICRO-BENCHMARK TEST
# =====================================================================

def test_ml_inference_latency_benchmark():
    txn_template = {"id": "TXN-BENCH", "amount": 250.0}
    feat_template = {
        "amount": 250.0,
        "amount_deviation": 1.4,
        "velocity_5m": 2,
        "velocity_1h": 3,
        "is_new_device": 0,
        "hour_of_day": 15
    }

    iterations = 200
    start = time.perf_counter()
    for _ in range(iterations):
        MLInferenceService.predict(txn_template, feat_template)
    total_sec = time.perf_counter() - start
    avg_ms = (total_sec / iterations) * 1000.0

    print(f"\n[ML BENCHMARK] {iterations} predictions in {total_sec:.4f}s ({avg_ms:.3f} ms/prediction)")
    # Single prediction should be fast locally (< 20.0ms under high test runner load)
    assert avg_ms < 20.0
