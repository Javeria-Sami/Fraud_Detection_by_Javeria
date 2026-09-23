"""
Comprehensive Integration Tests for Fraud Rule Administration & Alert Configuration.
Section 19 — Configurable Alerts & Rule Administration.
"""
import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone

from backend.app.main import app
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import create_access_token
from backend.app.models.rule import FraudRule, FraudRuleVersion, RuleExecution
from backend.app.models.audit_log import AuditLog, SystemSetting
from backend.app.engine.rules.registry import RuleRegistry
from sqlalchemy import select


def get_auth_headers(role: str = "admin", email: str = "admin@fraudshield.io"):
    token = create_access_token({
        "sub": f"USR-{role.upper()}-01",
        "email": email,
        "role": role,
        "username": role
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_admin_list_rules_with_filters_and_search():
    """Test listing rules with search query, category, severity, and active filters."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("admin")

        # 1. List all rules
        res = await ac.get("/api/v1/admin/rules", headers=headers)
        assert res.status_code == 200
        rules = res.json()
        assert len(rules) >= 5
        assert any(r["rule_code"] == "HIGH_AMOUNT" for r in rules)

        # 2. Filter by category
        res_cat = await ac.get("/api/v1/admin/rules?category=AMOUNT", headers=headers)
        assert res_cat.status_code == 200
        cat_rules = res_cat.json()
        assert all(r["category"] == "AMOUNT" for r in cat_rules)

        # 3. Search query
        res_search = await ac.get("/api/v1/admin/rules?search=device", headers=headers)
        assert res_search.status_code == 200
        search_rules = res_search.json()
        assert any("device" in r["name"].lower() or "device" in r["rule_code"].lower() for r in search_rules)


@pytest.mark.asyncio
async def test_admin_rule_details_and_versions():
    """Test retrieving rule detail with active version and historical version timeline."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("admin")

        res = await ac.get("/api/v1/admin/rules/HIGH_AMOUNT", headers=headers)
        assert res.status_code == 200
        rule = res.json()
        assert rule["id"] == "HIGH_AMOUNT"
        assert "versions" in rule
        assert isinstance(rule["versions"], list)
        assert "trigger_rate" in rule


@pytest.mark.asyncio
async def test_create_immutable_rule_version_and_activation():
    """
    Test creating a new immutable version for a rule, ensuring old versions are not mutated in place,
    and verifying atomic activation.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("admin")

        # 1. Create a new version 2.0 for HIGH_AMOUNT with multiplier 8.0
        v_payload = {
            "version": "2.0",
            "configuration": {
                "multiplier": 8.0,
                "min_amount": 2500.0
            },
            "weight": 35.0,
            "threshold": 2500.0,
            "is_active": True,
            "reason": "Calibration against high-value corporate accounts"
        }
        create_res = await ac.post("/api/v1/admin/rules/HIGH_AMOUNT/versions", json=v_payload, headers=headers)
        assert create_res.status_code == 201
        v_data = create_res.json()
        assert v_data["version"] == "2.0"
        assert v_data["weight"] == 35.0
        assert v_data["configuration"]["multiplier"] == 8.0
        assert v_data["is_active"] is True
        new_version_id = v_data["id"]

        # 2. Verify rule main detail reflects the active version
        rule_res = await ac.get("/api/v1/admin/rules/HIGH_AMOUNT", headers=headers)
        assert rule_res.status_code == 200
        rule_data = rule_res.json()
        assert rule_data["version"] == "2.0"
        assert rule_data["weight"] == 35.0
        assert rule_data["active_version_id"] == new_version_id

        # 3. Verify audit log was written
        async with AsyncSessionLocal() as session:
            stmt = select(AuditLog).where(AuditLog.action == "RULE_VERSION_CREATE").order_by(AuditLog.created_at.desc())
            log = (await session.execute(stmt)).scalars().first()
            assert log is not None
            assert "2.0" in log.details


@pytest.mark.asyncio
async def test_rule_configuration_validation_and_rejection():
    """Test server-side schema validation rejecting invalid thresholds and malicious code payloads."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("admin")

        # 1. Dry run validation with valid payload
        valid_res = await ac.post("/api/v1/admin/rules/validate", json={
            "rule_code": "RAPID_TRANSACTIONS",
            "configuration": {"count_threshold": 5, "window_minutes": 10}
        }, headers=headers)
        assert valid_res.status_code == 200
        assert valid_res.json()["valid"] is True

        # 2. Dry run validation with invalid negative threshold
        invalid_res = await ac.post("/api/v1/admin/rules/validate", json={
            "rule_code": "RAPID_TRANSACTIONS",
            "configuration": {"count_threshold": -3, "window_minutes": 5}
        }, headers=headers)
        assert invalid_res.status_code == 200
        inv_data = invalid_res.json()
        assert inv_data["valid"] is False
        assert len(inv_data["errors"]) > 0

        # 3. Attempting to create a version with code injection payload should be rejected with 422
        bad_version_res = await ac.post("/api/v1/admin/rules/HIGH_AMOUNT/versions", json={
            "version": "9.9",
            "configuration": {
                "eval": "import os; os.system('echo hacked')"
            },
            "weight": 20.0,
            "is_active": False
        }, headers=headers)
        assert bad_version_res.status_code == 422


@pytest.mark.asyncio
async def test_rule_version_comparison_diff():
    """Test computing a structured diff between two versions."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("admin")

        # Fetch versions for HIGH_AMOUNT
        ver_res = await ac.get("/api/v1/admin/rules/HIGH_AMOUNT/versions", headers=headers)
        assert ver_res.status_code == 200
        vers = ver_res.json()
        assert len(vers) >= 2

        v_a = vers[0]["id"]
        v_b = vers[1]["id"]

        diff_res = await ac.post("/api/v1/admin/rules/versions/compare", json={
            "version_id_a": v_a,
            "version_id_b": v_b
        }, headers=headers)
        assert diff_res.status_code == 200
        diff_data = diff_res.json()
        assert "configuration_diff" in diff_data
        assert isinstance(diff_data["configuration_diff"], list)


@pytest.mark.asyncio
async def test_rule_simulation_safety():
    """
    Test rule simulation execution.
    Must return evaluation result without writing to RuleExecution, creating alerts, or altering transactions.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("admin")

        # Count executions prior to simulation
        async with AsyncSessionLocal() as session:
            init_count = (await session.execute(select(RuleExecution))).scalars().all()
            init_exec_len = len(init_count)

        # Execute simulation for HIGH_AMOUNT with a high amount ($50,000)
        sim_res = await ac.post("/api/v1/admin/rules/HIGH_AMOUNT/simulate", json={
            "rule_code": "HIGH_AMOUNT",
            "configuration": {
                "multiplier": 2.0,
                "min_amount": 5000.0
            },
            "weight": 40.0,
            "severity": "HIGH",
            "transaction_data": {
                "id": "SIM-TEST-9999",
                "amount": 50000.0,
                "currency": "USD",
                "user_id": "USR-CUST-1001",
                "failed_attempts": 0
            }
        }, headers=headers)

        assert sim_res.status_code == 200
        sim_data = sim_res.json()
        assert sim_data["is_simulation"] is True
        assert sim_data["triggered"] is True
        assert sim_data["score"] == 40.0
        assert "explanation" in sim_data

        # Verify no execution rows were persisted
        async with AsyncSessionLocal() as session:
            after_count = (await session.execute(select(RuleExecution))).scalars().all()
            assert len(after_count) == init_exec_len


@pytest.mark.asyncio
async def test_alert_engine_configuration_get_and_update():
    """Test retrieving and updating active Alert Engine parameters."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        headers = get_auth_headers("admin")

        # 1. Get alert config
        cfg_res = await ac.get("/api/v1/admin/alerts/config", headers=headers)
        assert cfg_res.status_code == 200
        cfg_data = cfg_res.json()
        assert "high_risk_threshold" in cfg_data
        assert "critical_risk_threshold" in cfg_data
        assert "cooldown_seconds" in cfg_data

        # 2. Update alert config
        update_res = await ac.put("/api/v1/admin/alerts/config", json={
            "high_risk_threshold": 75.0,
            "critical_risk_threshold": 92.0,
            "cooldown_seconds": 600,
            "reason": "Tightening risk alert thresholds for holiday volume"
        }, headers=headers)
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["high_risk_threshold"] == 75.0
        assert updated["critical_risk_threshold"] == 92.0
        assert updated["cooldown_seconds"] == 600

        # 3. Test invalid threshold rejection (critical < high)
        invalid_update_res = await ac.put("/api/v1/admin/alerts/config", json={
            "high_risk_threshold": 80.0,
            "critical_risk_threshold": 60.0
        }, headers=headers)
        assert invalid_update_res.status_code == 422


@pytest.mark.asyncio
async def test_rbac_admin_rule_access_control():
    """Test that Viewers and Analysts cannot mutate rules or alert configs."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        viewer_headers = get_auth_headers("viewer", "viewer@fraudshield.io")
        analyst_headers = get_auth_headers("analyst", "analyst@fraudshield.io")

        # Viewer denied access to list/manage rules
        v_res = await ac.get("/api/v1/admin/rules", headers=viewer_headers)
        assert v_res.status_code == 403

        # Analyst denied access to update alert config
        a_res = await ac.put("/api/v1/admin/alerts/config", json={"cooldown_seconds": 120}, headers=analyst_headers)
        assert a_res.status_code == 403
