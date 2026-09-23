"""
Integration and RBAC API tests for Model Monitoring & MLOps endpoints.
Section 20 — Model Monitoring & MLOps.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
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
async def test_mlops_health_summary_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = get_auth_headers("analyst")
        res = await ac.get("/api/v1/ml-monitoring/health", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "health_status" in data
        assert "active_model_version" in data
        assert "p95_latency_ms" in data
        assert "prediction_volume" in data


@pytest.mark.asyncio
async def test_list_monitored_models_and_drift_matrix():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        headers = get_auth_headers("analyst")

        # 1. List models
        models_res = await ac.get("/api/v1/ml-monitoring/models", headers=headers)
        assert models_res.status_code == 200
        models = models_res.json()
        assert isinstance(models, list)
        assert len(models) > 0
        assert "health_status" in models[0]

        # 2. Get feature drift matrix
        drift_res = await ac.get("/api/v1/ml-monitoring/drift", headers=headers)
        assert drift_res.status_code == 200
        drift_items = drift_res.json()
        assert isinstance(drift_items, list)


@pytest.mark.asyncio
async def test_manual_monitoring_run_trigger_and_history():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_headers = get_auth_headers("admin")

        # 1. Trigger manual monitoring run
        payload = {}
        run_res = await ac.post("/api/v1/ml-monitoring/run", json=payload, headers=admin_headers)
        assert run_res.status_code == 201
        run_data = run_res.json()
        assert run_data["status"] == "COMPLETED"
        assert "records_evaluated" in run_data
        run_id = run_data["id"]

        # 2. Retrieve run detail
        detail_res = await ac.get(f"/api/v1/ml-monitoring/runs/{run_id}", headers=admin_headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["id"] == run_id
        assert "drift_results" in detail
        assert "metric_snapshots" in detail

        # 3. List historical runs
        list_res = await ac.get("/api/v1/ml-monitoring/runs", headers=admin_headers)
        assert list_res.status_code == 200
        runs_page = list_res.json()
        assert runs_page["total"] >= 1
        assert len(runs_page["items"]) >= 1


@pytest.mark.asyncio
async def test_monitoring_config_get_and_update():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        admin_headers = get_auth_headers("admin")
        viewer_headers = get_auth_headers("viewer")

        # 1. Get config
        cfg_res = await ac.get("/api/v1/ml-monitoring/config", headers=admin_headers)
        assert cfg_res.status_code == 200
        cfg = cfg_res.json()
        assert "psi_warning_threshold" in cfg

        # 2. Admin update config
        update_payload = {
            "psi_warning_threshold": 0.12,
            "latency_p95_warning_ms": 120.0
        }
        put_res = await ac.put("/api/v1/ml-monitoring/config", json=update_payload, headers=admin_headers)
        assert put_res.status_code == 200
        updated = put_res.json()
        assert updated["psi_warning_threshold"] == 0.12
        assert updated["latency_p95_warning_ms"] == 120.0

        # 3. Viewer denied update (403)
        forbidden_res = await ac.put("/api/v1/ml-monitoring/config", json=update_payload, headers=viewer_headers)
        assert forbidden_res.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_requests_rejected():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/ml-monitoring/health")
        assert res.status_code in [401, 403]
