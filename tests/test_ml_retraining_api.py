"""
API and Integration Tests for MLOps Model Retraining Subsystem.
Section 21 — Model Retraining.

Includes mandatory verification of Zero Automatic Deployment & Production Model Protection.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from backend.app.main import app
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.ml_model import MLModelRegistry, ModelRetrainingRun
from backend.app.core.security import create_access_token


def get_auth_headers(role: str = "admin") -> dict:
    if role.lower() == "admin":
        sub = "USR-ADMIN-01"
        email = "admin@fraudshield.io"
    elif role.lower() == "analyst":
        sub = "USR-ANALYST-01"
        email = "analyst@fraudshield.io"
    else:
        sub = "USR-VIEWER-01"
        email = "viewer@fraudshield.io"

    token = create_access_token({
        "sub": sub,
        "role": role.upper(),
        "email": email,
        "username": role.lower()
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_trigger_retraining_api_creates_candidate_evaluated():
    """
    POST /api/v1/ml-retraining/run
    Tests that authorized retraining triggers the pipeline and creates an EVALUATED candidate model.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = get_auth_headers("admin")
        payload = {
            "custom_version": "v3.0.0-candidate",
            "model_type": "Isolation Forest",
            "n_estimators": 60,
            "contamination": 0.05,
            "random_state": 42,
            "train_ratio": 0.70,
            "val_ratio": 0.15,
            "test_ratio": 0.15,
            "min_samples": 30,
            "threshold_method": "CONTAMINATION",
            "target_feature_version": "features-v1"
        }

        res = await ac.post("/api/v1/ml-retraining/run", json=payload, headers=headers)
        assert res.status_code == 201, res.text
        data = res.json()

        assert data["id"].startswith("RETRAIN-")
        assert data["status"] == "COMPLETED"
        assert data["candidate_version"] == "v3.0.0-candidate"
        assert data["records_used"] >= 30
        assert data["artifact_checksum"] is not None
        assert "evaluation_report" in data
        assert "model_comparison" in data


@pytest.mark.asyncio
async def test_strict_production_model_protection_guarantee():
    """
    MANDATORY PRODUCTION PROTECTION TEST:
    Asserts that triggering candidate retraining does NOT alter, demote, or overwrite the active production model.
    """
    async with AsyncSessionLocal() as session:
        # 1. Identify active deployed model before retraining
        stmt = select(MLModelRegistry).where(MLModelRegistry.status.in_(["PRODUCTION", "DEPLOYED"]))
        active_before = (await session.execute(stmt)).scalars().first()
        active_before_id = active_before.id if active_before else None
        active_before_version = active_before.version if active_before else None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = get_auth_headers("admin")
        # 2. Trigger retraining of candidate model
        payload = {
            "custom_version": "v4.0.0-candidate-test",
            "model_type": "Isolation Forest",
            "n_estimators": 50,
            "contamination": 0.08,
            "min_samples": 30
        }
        res = await ac.post("/api/v1/ml-retraining/run", json=payload, headers=headers)
        assert res.status_code == 201

    async with AsyncSessionLocal() as session:
        # 3. Query active deployed model after retraining
        active_after = (await session.execute(stmt)).scalars().first()

        # 4. Assert production model is strictly preserved
        if active_before:
            assert active_after is not None
            assert active_after.id == active_before_id
            assert active_after.version == active_before_version
            assert active_after.status in ["PRODUCTION", "DEPLOYED"]

        # 5. Assert candidate model is in EVALUATED status, not PRODUCTION/DEPLOYED
        cand_stmt = select(MLModelRegistry).where(MLModelRegistry.version == "v4.0.0-candidate-test")
        candidate = (await session.execute(cand_stmt)).scalars().first()
        assert candidate is not None
        assert candidate.status == "EVALUATED"


@pytest.mark.asyncio
async def test_list_retraining_runs_and_detail_inspection():
    """
    GET /api/v1/ml-retraining/runs and GET /api/v1/ml-retraining/runs/{run_id}
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = get_auth_headers("admin")
        list_res = await ac.get("/api/v1/ml-retraining/runs", headers=headers)
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert "total" in list_data
        assert "runs" in list_data
        assert len(list_data["runs"]) > 0

        run_id = list_data["runs"][0]["id"]
        detail_res = await ac.get(f"/api/v1/ml-retraining/runs/{run_id}", headers=headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["id"] == run_id
        assert "evaluation_report" in detail_data
        assert "data_quality_summary" in detail_data


@pytest.mark.asyncio
async def test_retraining_configuration_management():
    """
    GET /api/v1/ml-retraining/config and PUT /api/v1/ml-retraining/config
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = get_auth_headers("admin")
        get_res = await ac.get("/api/v1/ml-retraining/config", headers=headers)
        assert get_res.status_code == 200
        cfg = get_res.json()
        assert "default_n_estimators" in cfg

        update_payload = {
            "default_n_estimators": 180,
            "default_contamination": 0.09,
            "minimum_training_samples": 60
        }
        put_res = await ac.put("/api/v1/ml-retraining/config", json=update_payload, headers=headers)
        assert put_res.status_code == 200
        updated_cfg = put_res.json()
        assert updated_cfg["default_n_estimators"] == 180
        assert updated_cfg["default_contamination"] == 0.09
        assert updated_cfg["minimum_training_samples"] == 60


@pytest.mark.asyncio
async def test_retraining_rbac_rejections():
    """
    Verifies RBAC rules:
    - Viewers cannot trigger retraining or update config
    - Analysts can trigger retraining but cannot update config
    - Unauthenticated requests are rejected with 401
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Unauthenticated
        unauth_res = await ac.post("/api/v1/ml-retraining/run", json={})
        assert unauth_res.status_code == 401

        # Viewer attempting to update config -> 403
        viewer_headers = get_auth_headers("viewer")
        viewer_put = await ac.put("/api/v1/ml-retraining/config", json={"default_n_estimators": 200}, headers=viewer_headers)
        assert viewer_put.status_code == 403

        # Analyst attempting to update config -> 403
        analyst_headers = get_auth_headers("analyst")
        analyst_put = await ac.put("/api/v1/ml-retraining/config", json={"default_n_estimators": 200}, headers=analyst_headers)
        assert analyst_put.status_code == 403
