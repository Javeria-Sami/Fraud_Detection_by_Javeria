"""
Unit Tests for Rule Engine and Case Management Workflow.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_case_lifecycle_and_resolution():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as Analyst
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "analyst@fraudshield.io",
            "password": "Analyst@123456"
        })
        headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        # 2. Create Case
        case_payload = {
            "title": "Suspicious Crypto Burst Investigation",
            "user_id": "USR-1002",
            "severity": "HIGH",
            "initial_note": "Observed rapid high-value transactions from foreign IP."
        }
        create_res = await ac.post("/api/v1/cases", json=case_payload, headers=headers)
        assert create_res.status_code == 200
        case_data = create_res.json()
        case_id = case_data["id"]
        assert case_data["status"] == "OPEN"
        assert len(case_data["notes"]) == 1

        # 3. Add Note
        note_res = await ac.post(f"/api/v1/cases/{case_id}/notes", json={
            "content": "Contacted cardholder to verify recent transactions."
        }, headers=headers)
        assert note_res.status_code == 200

        # 4. Add Evidence
        evidence_res = await ac.post(f"/api/v1/cases/{case_id}/evidence", json={
            "title": "Suspicious Device Fingerprint Log",
            "evidence_type": "DEVICE_FINGERPRINT",
            "payload": {"ip": "185.220.101.5", "tor_exit_node": True}
        }, headers=headers)
        assert evidence_res.status_code == 200

        # 5. Resolve Case
        resolve_res = await ac.post(f"/api/v1/cases/{case_id}/resolve", json={
            "resolution": "Confirmed Fraud",
            "resolution_notes": "Cardholder confirmed unauthorized account takeover."
        }, headers=headers)
        assert resolve_res.status_code == 200
        resolved_data = resolve_res.json()
        assert resolved_data["status"] == "RESOLVED"
        assert resolved_data["resolution"] == "Confirmed Fraud"

@pytest.mark.asyncio
async def test_admin_settings_and_rules():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Login as Admin
        admin_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@fraudshield.io",
            "password": "Admin@123456"
        })
        headers = {"Authorization": f"Bearer {admin_res.json()['access_token']}"}

        # 1. Fetch rules
        rules_res = await ac.get("/api/v1/admin/rules", headers=headers)
        assert rules_res.status_code == 200
        rules = rules_res.json()
        assert len(rules) >= 9

        # 2. Update a rule weight
        target_rule = rules[0]
        update_res = await ac.patch(f"/api/v1/admin/rules/{target_rule['id']}", json={
            "weight": 35.0,
            "severity": "CRITICAL"
        }, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json()["weight"] == 35.0
        assert update_res.json()["severity"] == "CRITICAL"

        # 3. Check Audit Log generated
        audit_res = await ac.get("/api/v1/audit-logs", headers=headers)
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert any(l["action"] == "RULE_UPDATE" for l in logs)
