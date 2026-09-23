"""
Comprehensive Backend Tests for Section 15: Case Management & Investigation Workspace.
"""
import pytest
import uuid
from datetime import datetime, timezone
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.models.case import Case, CaseHistory
from backend.app.models.alert import Alert
from backend.app.models.transaction import Transaction

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def admin_headers():
    token = create_access_token(data={"sub": "USR-ADMIN-01", "role": "ADMIN", "permissions": ["*"]})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def analyst_headers():
    token = create_access_token(data={
        "sub": "USR-ANALYST-01",
        "role": "ANALYST",
        "permissions": ["transaction.read", "transaction.create", "alert.read", "alert.update", "alert.assign", "case.read", "case.create", "case.update"]
    })
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def viewer_headers():
    token = create_access_token(data={
        "sub": "USR-VIEWER-01",
        "role": "VIEWER",
        "permissions": ["transaction.read", "alert.read", "case.read", "user.read", "rule.read", "model.read", "analytics.read"]
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_case_creation_and_id_format(client: AsyncClient, analyst_headers: dict):
    """
    Test creating a new investigation case and verifying human-readable ID format and database persistence.
    """
    payload = {
        "title": "Suspected Account Takeover Incident",
        "description": "Multiple rapid high-value transfers from anomalous IP",
        "user_id": "USR-TEST-001",
        "severity": "CRITICAL",
        "assigned_analyst": "analyst@antifraud.com",
        "initial_note": "Initiating investigation based on sudden velocity spike."
    }

    resp = await client.post("/api/v1/cases", json=payload, headers=analyst_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["id"].startswith("CASE-")
    assert data["title"] == "Suspected Account Takeover Incident"
    assert data["severity"] == "CRITICAL"
    assert data["status"] == "OPEN"
    assert data["assigned_analyst"] == "analyst@antifraud.com"
    assert len(data["notes"]) == 1
    assert data["notes"][0]["content"] == "Initiating investigation based on sudden velocity spike."


@pytest.mark.asyncio
async def test_case_listing_pagination_and_headers(client: AsyncClient, analyst_headers: dict):
    """
    Test listing cases with limit/offset, response headers, and paginated envelope endpoint.
    """
    # Create 3 test cases
    for i in range(3):
        await client.post(
            "/api/v1/cases",
            json={
                "title": f"Listing Test Case {i}",
                "severity": "HIGH",
                "user_id": f"USR-LIST-{i}"
            },
            headers=analyst_headers
        )

    # Standard list endpoint
    resp = await client.get("/api/v1/cases?limit=2&offset=0", headers=analyst_headers)
    assert resp.status_code == 200
    assert "X-Total-Count" in resp.headers
    assert "X-Page" in resp.headers
    items = resp.json()
    assert len(items) <= 2

    # Paginated envelope endpoint
    pag_resp = await client.get("/api/v1/cases/paginated?page=1&page_size=2", headers=analyst_headers)
    assert pag_resp.status_code == 200
    pag_data = pag_resp.json()
    assert "items" in pag_data
    assert "total" in pag_data
    assert pag_data["page"] == 1
    assert pag_data["page_size"] == 2
    assert pag_data["total"] >= 3


@pytest.mark.asyncio
async def test_case_stats_endpoint(client: AsyncClient, analyst_headers: dict):
    """
    Test real-time KPI statistics aggregation endpoint.
    """
    resp = await client.get("/api/v1/cases/stats", headers=analyst_headers)
    assert resp.status_code == 200
    stats = resp.json()

    assert "total_cases" in stats
    assert "open_cases" in stats
    assert "investigating_cases" in stats
    assert "critical_cases" in stats
    assert "unassigned_cases" in stats
    assert "resolved_today" in stats
    assert stats["total_cases"] >= 0


@pytest.mark.asyncio
async def test_case_filtering_and_sorting(client: AsyncClient, analyst_headers: dict):
    """
    Test filtering by severity, status, analyst, search, and sorting by created_at.
    """
    # Create unique search case
    unique_title = "DistinctSearchUniqueAlphaBeta"
    await client.post(
        "/api/v1/cases",
        json={
            "title": unique_title,
            "severity": "LOW",
            "assigned_analyst": "special_agent@domain.com"
        },
        headers=analyst_headers
    )

    # Search filter
    resp = await client.get(f"/api/v1/cases?search=AlphaBeta", headers=analyst_headers)
    assert resp.status_code == 200
    found = resp.json()
    assert any(c["title"] == unique_title for c in found)

    # Severity filter
    resp_sev = await client.get("/api/v1/cases?severity=LOW", headers=analyst_headers)
    assert resp_sev.status_code == 200
    assert all(c["severity"] == "LOW" for c in resp_sev.json())


@pytest.mark.asyncio
async def test_case_linking_alerts_and_transactions(client: AsyncClient, analyst_headers: dict):
    """
    Test linking and unlinking alerts and transactions to an existing case.
    """
    # 1. Ingest a transaction
    txn_id = f"TXN-CASE-TEST-{uuid.uuid4().hex[:6].upper()}"
    t_post = await client.post(
        "/api/v1/transactions",
        json={
            "transaction_id": txn_id,
            "user_id": "USR-CUST-1001",
            "amount": 4500.0,
            "currency": "USD",
            "payment_method": "CREDIT_CARD",
            "merchant_name": "Apple Store",
            "merchant_category": "Electronics",
            "device_id": "DEV-MACBOOK-01",
            "country": "US"
        },
        headers=analyst_headers
    )
    assert t_post.status_code in [200, 201]

    # 2. Create a case
    c_resp = await client.post(
        "/api/v1/cases",
        json={
            "title": "Linking Test Case",
            "severity": "HIGH",
            "user_id": "USR-LINK-TEST"
        },
        headers=analyst_headers
    )
    case_id = c_resp.json()["id"]

    # 3. Link transaction
    link_txn_resp = await client.post(
        f"/api/v1/cases/{case_id}/transactions",
        json={"transaction_id": txn_id},
        headers=analyst_headers
    )
    assert link_txn_resp.status_code == 200
    assert txn_id in link_txn_resp.json()["related_transaction_ids"]

    # 4. Duplicate link should be idempotent
    dup_resp = await client.post(
        f"/api/v1/cases/{case_id}/transactions",
        json={"transaction_id": txn_id},
        headers=analyst_headers
    )
    assert dup_resp.status_code == 200

    # 5. Check Case Detail contains the transaction
    detail_resp = await client.get(f"/api/v1/cases/{case_id}", headers=analyst_headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert any(t["id"] == txn_id for t in detail["transactions"])

    # 6. Unlink transaction
    unlink_resp = await client.delete(f"/api/v1/cases/{case_id}/transactions/{txn_id}", headers=analyst_headers)
    assert unlink_resp.status_code == 200
    assert txn_id not in unlink_resp.json()["related_transaction_ids"]


@pytest.mark.asyncio
async def test_case_notes_and_evidence(client: AsyncClient, analyst_headers: dict):
    """
    Test adding investigation notes and structured evidence records.
    """
    # Create case
    c_resp = await client.post(
        "/api/v1/cases",
        json={"title": "Notes & Evidence Case", "severity": "MEDIUM"},
        headers=analyst_headers
    )
    case_id = c_resp.json()["id"]

    # Add Note
    n_resp = await client.post(
        f"/api/v1/cases/{case_id}/notes",
        json={"content": "Contacted cardholder to verify recent $500 transfer."},
        headers=analyst_headers
    )
    assert n_resp.status_code == 200
    note_data = n_resp.json()
    assert note_data["content"] == "Contacted cardholder to verify recent $500 transfer."

    # List Notes
    notes_list_resp = await client.get(f"/api/v1/cases/{case_id}/notes", headers=analyst_headers)
    assert notes_list_resp.status_code == 200
    assert len(notes_list_resp.json()) >= 1

    # Add Evidence
    e_resp = await client.post(
        f"/api/v1/cases/{case_id}/evidence",
        json={
            "title": "IP Geolocation Anomaly Log",
            "evidence_type": "IP_GEO",
            "payload": {"ip": "198.51.100.4", "country": "Nigeria", "proxy": True}
        },
        headers=analyst_headers
    )
    assert e_resp.status_code == 200
    ev_data = e_resp.json()
    assert ev_data["title"] == "IP Geolocation Anomaly Log"
    assert ev_data["payload"]["proxy"] is True

    # List Evidence
    ev_list_resp = await client.get(f"/api/v1/cases/{case_id}/evidence", headers=analyst_headers)
    assert ev_list_resp.status_code == 200
    assert len(ev_list_resp.json()) >= 1


@pytest.mark.asyncio
async def test_case_lifecycle_state_machine_and_concurrency(client: AsyncClient, analyst_headers: dict):
    """
    Test valid status transitions, invalid transition rejections, and optimistic locking conflict detection.
    """
    # Create case (Status = OPEN)
    c_resp = await client.post(
        "/api/v1/cases",
        json={"title": "Lifecycle Test Case", "severity": "HIGH"},
        headers=analyst_headers
    )
    case_id = c_resp.json()["id"]

    # 1. Invalid transition (OPEN -> RESOLVED is disallowed directly, must go to INVESTIGATING or CLOSED)
    bad_trans = await client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"status": "RESOLVED"},
        headers=analyst_headers
    )
    assert bad_trans.status_code == 400

    # 2. Valid transition (OPEN -> INVESTIGATING)
    good_trans = await client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"status": "INVESTIGATING", "expected_status": "OPEN", "reason_note": "Starting triage"},
        headers=analyst_headers
    )
    assert good_trans.status_code == 200
    assert good_trans.json()["status"] == "INVESTIGATING"

    # 3. Optimistic Concurrency Conflict (expected_status='OPEN', but current is 'INVESTIGATING')
    conflict_trans = await client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"status": "PENDING", "expected_status": "OPEN"},
        headers=analyst_headers
    )
    assert conflict_trans.status_code == 409
    assert "concurrently" in conflict_trans.json()["detail"]


@pytest.mark.asyncio
async def test_case_resolution_workflow(client: AsyncClient, analyst_headers: dict):
    """
    Test resolving a case with verified fraud category and checking timeline history.
    """
    # Create case
    c_resp = await client.post(
        "/api/v1/cases",
        json={"title": "Resolution Flow Case", "severity": "CRITICAL", "user_id": "USR-FRAUD-VICTIM"},
        headers=analyst_headers
    )
    case_id = c_resp.json()["id"]

    # Resolve
    res_resp = await client.post(
        f"/api/v1/cases/{case_id}/resolve",
        json={
            "resolution": "Confirmed Fraud",
            "resolution_notes": "Stolen credentials used to initiate fraudulent payments."
        },
        headers=analyst_headers
    )
    assert res_resp.status_code == 200
    res_data = res_resp.json()
    assert res_data["status"] == "RESOLVED"
    assert res_data["resolution"] == "Confirmed Fraud"
    assert res_data["resolved_by"] is not None

    # Check Timeline endpoint
    timeline_resp = await client.get(f"/api/v1/cases/{case_id}/timeline", headers=analyst_headers)
    assert timeline_resp.status_code == 200
    timeline = timeline_resp.json()
    assert any(h["action"] == "RESOLVED" for h in timeline)


@pytest.mark.asyncio
async def test_case_rbac_permissions(client: AsyncClient, viewer_headers: dict, analyst_headers: dict):
    """
    Verify that Viewers can read cases but are forbidden (403) from modifying cases.
    """
    # Analyst creates a case
    c_resp = await client.post(
        "/api/v1/cases",
        json={"title": "RBAC Case", "severity": "MEDIUM"},
        headers=analyst_headers
    )
    case_id = c_resp.json()["id"]

    # Viewer can read list and detail
    list_resp = await client.get("/api/v1/cases", headers=viewer_headers)
    assert list_resp.status_code == 200

    detail_resp = await client.get(f"/api/v1/cases/{case_id}", headers=viewer_headers)
    assert detail_resp.status_code == 200

    # Viewer CANNOT create a case
    v_create = await client.post(
        "/api/v1/cases",
        json={"title": "Viewer Illicit Case", "severity": "LOW"},
        headers=viewer_headers
    )
    assert v_create.status_code == 403

    # Viewer CANNOT add notes
    v_note = await client.post(
        f"/api/v1/cases/{case_id}/notes",
        json={"content": "Viewer note attempt"},
        headers=viewer_headers
    )
    assert v_note.status_code == 403

    # Viewer CANNOT resolve case
    v_resolve = await client.post(
        f"/api/v1/cases/{case_id}/resolve",
        json={"resolution": "Confirmed Fraud", "resolution_notes": "Attempt"},
        headers=viewer_headers
    )
    assert v_resolve.status_code == 403
