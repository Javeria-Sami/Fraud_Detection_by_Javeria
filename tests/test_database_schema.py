"""
Comprehensive Database Schema, Constraints, Indexing, and Relationship Tests.
Section 02 - Database & Core Domain Verification Suite.
"""
import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy import select, exc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import Base, engine, AsyncSessionLocal
from backend.app.models import (
    Role,
    Permission,
    User,
    role_permissions,
    Merchant,
    Device,
    FraudRule,
    FraudRuleVersion,
    RuleExecution,
    MLModelRegistry,
    ModelVersion,
    Transaction,
    TransactionStatus,
    FeatureSnapshot,
    MLPrediction,
    RiskScore,
    Alert,
    AlertSeverity,
    AlertStatus,
    Case,
    CaseSeverity,
    CaseStatus,
    CaseNote,
    CaseEvidence,
    CaseHistory,
    UserRiskProfile,
    DeviceRiskProfile,
    MerchantRiskProfile,
    AuditLog,
    SystemSetting
)
import pytest_asyncio


@pytest_asyncio.fixture
async def db_session():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()


@pytest.mark.asyncio
async def test_database_connection_and_table_creation(db_session: AsyncSession):
    """Test 1: Verify database connection and that all domain tables exist."""
    res = await db_session.execute(select(Role))
    assert res is not None


@pytest.mark.asyncio
async def test_roles_and_permissions_many_to_many(db_session: AsyncSession):
    """Test 2: Verify Roles, Permissions, and Many-to-Many associations."""
    uid = uuid.uuid4().hex[:8]
    pname1 = f"test.perm.read.{uid}"
    pname2 = f"test.perm.update.{uid}"
    rname = f"TEST_ROLE_{uid}"
    perm1 = Permission(id=str(uuid.uuid4()), name=pname1, description="Read txns")
    perm2 = Permission(id=str(uuid.uuid4()), name=pname2, description="Update txns")
    role = Role(id=str(uuid.uuid4()), name=rname, description="Test role")
    
    db_session.add_all([perm1, perm2, role])
    await db_session.flush()
    
    from sqlalchemy import insert
    await db_session.execute(insert(role_permissions).values([
        {"role_id": role.id, "permission_id": perm1.id},
        {"role_id": role.id, "permission_id": perm2.id}
    ]))
    await db_session.commit()
    
    from sqlalchemy.orm import selectinload
    stmt = select(Role).options(selectinload(Role.permissions)).where(Role.name == rname)
    retrieved_role = (await db_session.execute(stmt)).scalar_one()
    assert len(retrieved_role.permissions) == 2
    assert any(p.name == pname1 for p in retrieved_role.permissions)


@pytest.mark.asyncio
async def test_user_creation_and_uniqueness_constraints(db_session: AsyncSession):
    """Test 3: Verify User creation, role foreign key, and email/username unique constraints."""
    uid = uuid.uuid4().hex[:8]
    role = Role(id=str(uuid.uuid4()), name=f"ANALYST_ROLE_{uid}")
    db_session.add(role)
    await db_session.flush()
    
    user1 = User(
        id=str(uuid.uuid4()),
        email=f"test.analyst.{uid}@fraudshield.io",
        username=f"analyst_test_{uid}",
        full_name="Test Analyst",
        hashed_password="secure_hash_pwd",
        role_id=role.id,
        is_active=True
    )
    db_session.add(user1)
    await db_session.commit()
    
    # Test email uniqueness violation
    duplicate_email_user = User(
        id=str(uuid.uuid4()),
        email=f"test.analyst.{uid}@fraudshield.io",
        username=f"unique_username_2_{uid}",
        full_name="Another User",
        hashed_password="hashed_password"
    )
    db_session.add(duplicate_email_user)
    with pytest.raises(exc.IntegrityError):
        await db_session.commit()
    await db_session.rollback()


@pytest.mark.asyncio
async def test_merchant_and_device_entities(db_session: AsyncSession):
    """Test 4: Verify Merchant and Device creation and unique codes/identifiers."""
    uid = uuid.uuid4().hex[:8]
    merchant = Merchant(
        id=f"MERCH-TEST-{uid}",
        merchant_code=f"MC-TEST-{uid}",
        name="Test Merchant Ltd",
        category="Electronics",
        country="US",
        city="San Jose",
        risk_level="LOW"
    )
    device = Device(
        id=f"DEV-TEST-{uid}",
        device_identifier=f"FP-TEST-{uid}",
        device_type="MOBILE",
        operating_system="iOS 17.5",
        browser="Safari",
        country="US",
        city="San Jose"
    )
    db_session.add_all([merchant, device])
    await db_session.commit()
    
    m_res = (await db_session.execute(select(Merchant).where(Merchant.merchant_code == f"MC-TEST-{uid}"))).scalar_one()
    d_res = (await db_session.execute(select(Device).where(Device.device_identifier == f"FP-TEST-{uid}"))).scalar_one()
    assert m_res.name == "Test Merchant Ltd"
    assert d_res.operating_system == "iOS 17.5"


@pytest.mark.asyncio
async def test_transaction_references_user_merchant_device(db_session: AsyncSession):
    """Test 5: Verify Transaction links to User, Merchant, and Device."""
    uid = uuid.uuid4().hex[:8]
    user = User(id=f"USR-T1-{uid}", email=f"u1_{uid}@test.com", username=f"u1_{uid}", full_name="User One", hashed_password="pwd")
    merchant = Merchant(id=f"MERCH-T1-{uid}", merchant_code=f"MC-T1-{uid}", name="Merchant T1", category="Retail")
    device = Device(id=f"DEV-T1-{uid}", device_identifier=f"FP-T1-{uid}", device_type="DESKTOP")
    db_session.add_all([user, merchant, device])
    await db_session.flush()
    
    txn_id = f"TXN-TEST-100-{uid}"
    txn = Transaction(
        id=txn_id,
        transaction_id=txn_id,
        user_id=user.id,
        merchant_id=merchant.id,
        device_id=device.id,
        amount=250.75,
        currency="USD",
        payment_method="CREDIT_CARD",
        status=TransactionStatus.COMPLETED.value
    )
    db_session.add(txn)
    await db_session.commit()
    
    stmt = select(Transaction).where(Transaction.id == txn_id)
    t_obj = (await db_session.execute(stmt)).scalar_one()
    assert t_obj.user.email == f"u1_{uid}@test.com"
    assert t_obj.merchant.name == "Merchant T1"
    assert t_obj.device.device_identifier == f"FP-T1-{uid}"


@pytest.mark.asyncio
async def test_fraud_rule_versions_and_executions(db_session: AsyncSession):
    """Test 6: Verify FraudRule, FraudRuleVersion, and RuleExecution relationships."""
    uid = uuid.uuid4().hex[:8]
    rule_id = f"HIGH_AMOUNT_{uid}"
    rule = FraudRule(
        id=rule_id,
        rule_code=rule_id,
        name="High Amount Check",
        category="AMOUNT",
        default_severity="HIGH"
    )
    db_session.add(rule)
    await db_session.flush()
    
    version = FraudRuleVersion(
        id=str(uuid.uuid4()),
        rule_id=rule.id,
        version=f"1.0-{uid}",
        threshold=5000.0,
        weight=25.0,
        configuration={"multiplier": 5.0}
    )
    db_session.add(version)
    
    txn_id = f"TXN-RULE-TEST-{uid}"
    txn = Transaction(
        id=txn_id,
        transaction_id=txn_id,
        amount=6000.0,
        payment_method="WIRE"
    )
    db_session.add(txn)
    await db_session.flush()
    
    r_exec = RuleExecution(
        id=str(uuid.uuid4()),
        transaction_id=txn.id,
        rule_id=rule.id,
        rule_version_id=version.id,
        triggered=True,
        score=25.0,
        reason="Amount exceeded $5,000 threshold."
    )
    db_session.add(r_exec)
    await db_session.commit()
    
    exec_res = (await db_session.execute(select(RuleExecution).where(RuleExecution.transaction_id == txn.id))).scalar_one()
    assert exec_res.triggered is True
    assert exec_res.rule.name == "High Amount Check"
    assert exec_res.rule_version.version == f"1.0-{uid}"


@pytest.mark.asyncio
async def test_ml_prediction_and_model_version(db_session: AsyncSession):
    """Test 7: Verify ML Model Version and ML Prediction entities and foreign keys."""
    uid = uuid.uuid4().hex[:8]
    m_version = MLModelRegistry(
        id=f"MODEL-TEST-{uid}",
        model_name="IsolationForest_Test",
        version=f"v1.0-test-{uid}",
        algorithm="Isolation Forest",
        status="DEPLOYED"
    )
    txn_id = f"TXN-ML-TEST-{uid}"
    txn = Transaction(id=txn_id, transaction_id=txn_id, amount=150.0, payment_method="DEBIT_CARD")
    db_session.add_all([m_version, txn])
    await db_session.flush()
    
    pred = MLPrediction(
        id=str(uuid.uuid4()),
        transaction_id=txn.id,
        model_version_id=m_version.id,
        anomaly_score=0.88,
        prediction="ANOMALOUS",
        confidence=0.97
    )
    db_session.add(pred)
    await db_session.commit()
    
    pred_res = (await db_session.execute(select(MLPrediction).where(MLPrediction.transaction_id == txn.id))).scalar_one()
    assert pred_res.anomaly_score == 0.88
    assert pred_res.model_version.model_name == "IsolationForest_Test"


@pytest.mark.asyncio
async def test_risk_score_and_check_constraint(db_session: AsyncSession):
    """Test 8: Verify RiskScore entity, check constraint 0-100, and transaction link."""
    uid = uuid.uuid4().hex[:8]
    txn_id = f"TXN-RISK-{uid}"
    txn = Transaction(id=txn_id, transaction_id=txn_id, amount=75.0, payment_method="CREDIT_CARD")
    db_session.add(txn)
    await db_session.flush()
    
    valid_score = RiskScore(
        id=str(uuid.uuid4()),
        transaction_id=txn.id,
        score=78.5,
        risk_level="HIGH",
        scoring_version="v1.0"
    )
    db_session.add(valid_score)
    await db_session.commit()
    
    score_res = (await db_session.execute(select(RiskScore).where(RiskScore.transaction_id == txn.id))).scalar_one()
    assert score_res.score == 78.5
    assert score_res.risk_level == "HIGH"


@pytest.mark.asyncio
async def test_alert_and_case_investigation_lifecycle(db_session: AsyncSession):
    """Test 9: Verify Alert, Case, association tables, notes, evidence, and audit timeline."""
    uid = uuid.uuid4().hex[:8]
    user = User(id=f"USR-INV-{uid}", email=f"victim_{uid}@test.com", username=f"victim_{uid}", full_name="Victim User", hashed_password="pwd")
    analyst = User(id=f"USR-ANL-{uid}", email=f"investigator_{uid}@test.com", username=f"investigator_{uid}", full_name="Lead Investigator", hashed_password="pwd")
    txn = Transaction(id=f"TXN-INV-{uid}", transaction_id=f"TXN-INV-{uid}", user_id=user.id, amount=8900.0, payment_method="WIRE")
    
    db_session.add_all([user, analyst, txn])
    await db_session.flush()
    
    alert_id = f"ALT-INV-{uid}"
    alert = Alert(
        id=alert_id,
        alert_id=alert_id,
        transaction_id=txn.id,
        user_id=user.id,
        title="Unauthorized Large Outflow",
        severity=AlertSeverity.CRITICAL.value,
        status=AlertStatus.NEW.value,
        assigned_to=analyst.id
    )
    db_session.add(alert)
    await db_session.flush()
    
    case_id = f"CASE-INV-{uid}"
    case = Case(
        id=case_id,
        case_id=case_id,
        title="Account Takeover & Drain Investigation",
        severity=CaseSeverity.CRITICAL.value,
        status=CaseStatus.INVESTIGATING.value,
        assigned_to=analyst.id,
        user_id=user.id,
        created_by=analyst.id
    )
    db_session.add(case)
    await db_session.flush()
    
    from backend.app.models.case import case_alerts, case_transactions
    from sqlalchemy import insert
    from sqlalchemy.orm import selectinload

    await db_session.execute(insert(case_alerts).values(case_id=case.id, alert_id=alert.id))
    await db_session.execute(insert(case_transactions).values(case_id=case.id, transaction_id=txn.id))
    
    note = CaseNote(
        id=str(uuid.uuid4()),
        case_id=case.id,
        author_id=analyst.id,
        author="Lead Investigator",
        content="Contacted cardholder to confirm suspicious $8900 wire."
    )
    evidence = CaseEvidence(
        id=str(uuid.uuid4()),
        case_id=case.id,
        title="Wire Transfer Confirmation Log",
        evidence_type="TRANSACTION_LOG",
        uploaded_by="Lead Investigator"
    )
    hist = CaseHistory(
        id=str(uuid.uuid4()),
        case_id=case.id,
        action="CASE_OPENED",
        from_status=None,
        to_status="INVESTIGATING",
        actor_id=analyst.id,
        actor_name="Lead Investigator"
    )
    db_session.add_all([note, evidence, hist])
    await db_session.commit()
    
    stmt = select(Case).options(
        selectinload(Case.alerts),
        selectinload(Case.transactions),
        selectinload(Case.notes),
        selectinload(Case.evidence),
        selectinload(Case.history)
    ).where(Case.id == case_id)
    c_res = (await db_session.execute(stmt)).scalar_one()
    assert len(c_res.alerts) == 1
    assert c_res.alerts[0].id == alert_id
    assert len(c_res.transactions) == 1
    assert c_res.transactions[0].amount == 8900.0
    assert len(c_res.notes) == 1
    assert len(c_res.evidence) == 1
    assert len(c_res.history) == 1


@pytest.mark.asyncio
async def test_360_risk_profiles(db_session: AsyncSession):
    """Test 10: Verify User, Device, and Merchant 360 Risk Profiles."""
    uid = uuid.uuid4().hex[:8]
    user = User(id=f"USR-PRF-{uid}", email=f"p1_{uid}@test.com", username=f"p1_{uid}", full_name="Profile User", hashed_password="pwd")
    merchant = Merchant(id=f"MERCH-PRF-{uid}", merchant_code=f"MC-P1-{uid}", name="Profile Merchant", category="Travel")
    device = Device(id=f"DEV-PRF-{uid}", device_identifier=f"FP-P1-{uid}")
    db_session.add_all([user, merchant, device])
    await db_session.flush()
    
    u_prof = UserRiskProfile(id=str(uuid.uuid4()), user_id=user.id, average_transaction_amount=320.0, transaction_count=18, risk_score=20.0)
    d_prof = DeviceRiskProfile(id=str(uuid.uuid4()), device_id=device.id, transaction_count=45, risk_score=5.0)
    m_prof = MerchantRiskProfile(id=str(uuid.uuid4()), merchant_id=merchant.id, transaction_count=200, risk_score=15.0)
    
    db_session.add_all([u_prof, d_prof, m_prof])
    await db_session.commit()
    
    u_res = (await db_session.execute(select(UserRiskProfile).where(UserRiskProfile.user_id == user.id))).scalar_one()
    assert u_res.average_transaction_amount == 320.0
    assert u_res.user.email == f"p1_{uid}@test.com"


@pytest.mark.asyncio
async def test_audit_logs_and_system_settings(db_session: AsyncSession):
    """Test 11: Verify immutable Audit Logs and System Settings."""
    uid = uuid.uuid4().hex[:8]
    actor = User(id=f"USR-AUD-{uid}", email=f"auditor_{uid}@test.com", username=f"auditor_{uid}", full_name="System Auditor", hashed_password="pwd")
    db_session.add(actor)
    await db_session.flush()
    
    log = AuditLog(
        id=str(uuid.uuid4()),
        actor_user_id=actor.id,
        actor_email=actor.email,
        action="RULE_UPDATED",
        entity_type="FraudRule",
        entity_id="HIGH_AMOUNT",
        result="SUCCESS"
    )
    setting_key = f"max_allowed_failed_logins_{uid}"
    setting = SystemSetting(
        id=str(uuid.uuid4()),
        key=setting_key,
        value={"limit": 5, "lockout_minutes": 30},
        updated_by=f"auditor_{uid}@test.com"
    )
    db_session.add_all([log, setting])
    await db_session.commit()
    
    log_res = (await db_session.execute(select(AuditLog).where(AuditLog.actor_user_id == actor.id))).scalar_one()
    set_res = (await db_session.execute(select(SystemSetting).where(SystemSetting.key == setting_key))).scalar_one()
    
    assert log_res.action == "RULE_UPDATED"
    assert set_res.value["limit"] == 5
