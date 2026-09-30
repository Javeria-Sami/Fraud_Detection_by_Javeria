"""
Comprehensive Synthetic Database Seeder for Section 02 Domain Entities.
Creates initial synthetic data:
- Roles & Permissions (with Role-Permission mappings)
- Admin, Analyst, Viewer Users
- Merchants (various risk tiers & categories)
- Devices (desktop, mobile, tablet)
- Fraud Rules & Rule Versions
- Baseline Model Version
- Realistic Synthetic Transactions (Normal, High Amount, Rapid Velocity, New Device, Geo-hop, Failed Attempts)
- Feature Snapshots
- Rule Executions
- ML Predictions
- Risk Scores (with 0-100 check constraint compliance)
- Alerts (LOW, MEDIUM, HIGH, CRITICAL)
- Investigation Cases (with associated Alerts, Transactions, Notes, Evidence, and History events)
- User, Device, and Merchant 360 Risk Profiles
- Audit Logs
- System Settings
"""
import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, insert

from backend.app.core.database import AsyncSessionLocal, engine, Base, utc_now
from backend.app.core.security import get_password_hash
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
    case_alerts,
    case_transactions,
    UserRiskProfile,
    DeviceRiskProfile,
    MerchantRiskProfile,
    AuditLog,
    SystemSetting
)

async def seed_database():
    print("[*] Starting database seeding with synthetic test data...")
    async with AsyncSessionLocal() as session:
        # 1. Seed Permissions
        permissions_data = [
            ("transaction.read", "View transaction records and timeline"),
            ("transaction.create", "Ingest or simulate incoming transactions"),
            ("transaction.update", "Update transaction status and dispute flags"),
            ("alert.read", "View fraud alerts and anomaly notifications"),
            ("alert.update", "Triage, acknowledge, and resolve alerts"),
            ("alert.assign", "Assign alerts to analysts"),
            ("case.read", "View investigation cases and timeline"),
            ("case.create", "Open new investigation cases"),
            ("case.update", "Add evidence, notes, and resolve cases"),
            ("user.read", "View user profiles and behavioral risk profiles"),
            ("user.manage", "Manage system users, roles, and status"),
            ("rule.read", "View active fraud detection rules and versions"),
            ("rule.manage", "Create, edit, and configure fraud rules"),
            ("model.read", "View ML models, metrics, and drift telemetry"),
            ("model.manage", "Deploy, evaluate, or retire ML models"),
            ("analytics.read", "View analytical dashboards and trend reports"),
            ("audit.read", "View immutable audit logs and system activity"),
            ("settings.manage", "Manage system parameters and thresholds")
        ]
        
        perm_map = {}
        for p_name, p_desc in permissions_data:
            stmt = select(Permission).where(Permission.name == p_name)
            res = (await session.execute(stmt)).scalar_one_or_none()
            if not res:
                res = Permission(id=str(uuid.uuid4()), name=p_name, description=p_desc)
                session.add(res)
                await session.flush()
            perm_map[p_name] = res
        await session.flush()

        # 2. Seed Roles
        roles_spec = [
            ("ADMIN", "Full system administrator with security governance and config privileges", [p for p, _ in permissions_data]),
            ("ANALYST", "Fraud investigator with alert triage, case management, and rule testing access", [
                "transaction.read", "transaction.create", "alert.read", "alert.update", "alert.assign",
                "case.read", "case.create", "case.update", "user.read", "rule.read", "model.read", "analytics.read", "audit.read"
            ]),
            ("VIEWER", "Read-only operational and compliance monitoring access", [
                "transaction.read", "alert.read", "case.read", "user.read", "rule.read", "model.read", "analytics.read"
            ])
        ]

        role_map = {}
        for r_name, r_desc, perms in roles_spec:
            stmt = select(Role).where(Role.name == r_name)
            r_obj = (await session.execute(stmt)).scalar_one_or_none()
            if not r_obj:
                r_obj = Role(id=str(uuid.uuid4()), name=r_name, description=r_desc)
                session.add(r_obj)
                await session.flush()
                # Direct insertion into association table
                for p_key in perms:
                    if p_key in perm_map:
                        await session.execute(
                            insert(role_permissions).values(
                                role_id=r_obj.id,
                                permission_id=perm_map[p_key].id,
                                created_at=utc_now()
                            )
                        )
            role_map[r_name] = r_obj
        await session.flush()

        # 3. Seed Users
        users_spec = [
            ("USR-ADMIN-01", "admin@fraudshield.io", "admin", "Alex Mercer (Security Officer)", "Admin@123456", "ADMIN"),
            ("USR-ANALYST-01", "analyst@fraudshield.io", "analyst", "Elena Rostova (Lead Fraud Analyst)", "Analyst@123456", "ANALYST"),
            ("USR-VIEWER-01", "viewer@fraudshield.io", "viewer", "David Vance (Compliance Auditor)", "Viewer@123456", "VIEWER"),
            ("USR-CUST-1001", "john.doe@example.com", "johndoe", "John Doe (Customer)", "User@123456", "VIEWER"),
            ("USR-CUST-1002", "sarah.connor@example.com", "sarahc", "Sarah Connor (Customer)", "User@123456", "VIEWER"),
            ("USR-CUST-1003", "alice.smith@example.com", "alicesmith", "Alice Smith (Customer)", "User@123456", "VIEWER"),
            ("USR-CUST-1004", "elena.r@example.com", "elenar", "Elena Rostova", "User@123456", "VIEWER"),
            ("USR-CUST-1005", "marcus.v@example.com", "marcusv", "Marcus Vance", "User@123456", "VIEWER"),
            ("USR-CUST-1006", "tariq.m@example.com", "tariqm", "Tariq Al-Mansoor", "User@123456", "VIEWER"),
            ("USR-CUST-1007", "aiko.t@example.com", "aikot", "Aiko Tanaka", "User@123456", "VIEWER"),
            ("USR-CUST-1008", "david.b@example.com", "davidb", "David Becker", "User@123456", "VIEWER"),
            ("USR-CUST-1009", "chloe.d@example.com", "chloed", "Chloe Dubois", "User@123456", "VIEWER"),
            ("USR-CUST-1010", "liam.o@example.com", "liamo", "Liam O'Connor", "User@123456", "VIEWER"),
        ]

        user_map = {}
        for u_id, email, username, full_name, raw_pwd, r_name in users_spec:
            stmt = select(User).where(User.email == email)
            u_obj = (await session.execute(stmt)).scalar_one_or_none()
            if not u_obj:
                u_obj = User(
                    id=u_id,
                    email=email,
                    username=username,
                    full_name=full_name,
                    hashed_password=get_password_hash(raw_pwd),
                    role_id=role_map[r_name].id,
                    is_active=True,
                    is_verified=True
                )
                session.add(u_obj)
            user_map[u_id] = u_obj
        await session.flush()

        # 4. Seed Merchants
        merchants_spec = [
            ("MERCH-AMAZON", "MC-001", "Amazon Web Retail", "Electronics & Retail", "US", "Seattle", "LOW"),
            ("MERCH-APPLE", "MC-002", "Apple Store Online", "Electronics & Devices", "US", "Cupertino", "LOW"),
            ("MERCH-BINANCE", "MC-003", "Binance Global Exchange", "Crypto & Exchange", "KY", "George Town", "HIGH"),
            ("MERCH-GUCCI", "MC-004", "Gucci Fifth Avenue", "Luxury Goods", "US", "New York", "MEDIUM"),
            ("MERCH-DELTA", "MC-005", "Delta Air Lines", "Travel & Airlines", "US", "Atlanta", "LOW"),
            ("MERCH-STEAM", "MC-006", "Steam Gaming Platform", "Digital Goods", "US", "Bellevue", "LOW"),
            ("MERCH-CASINO", "MC-007", "Monte Carlo Royale", "Gambling & Casino", "MC", "Monaco", "CRITICAL")
        ]

        merchant_map = {}
        for m_id, code, name, cat, country, city, risk_tier in merchants_spec:
            stmt = select(Merchant).where(Merchant.id == m_id)
            m_obj = (await session.execute(stmt)).scalar_one_or_none()
            if not m_obj:
                m_obj = Merchant(
                    id=m_id,
                    merchant_code=code,
                    name=name,
                    category=cat,
                    country=country,
                    city=city,
                    risk_level=risk_tier,
                    is_active=True
                )
                session.add(m_obj)
            merchant_map[m_id] = m_obj
        await session.flush()

        # 5. Seed Devices
        devices_spec = [
            ("DEV-MACBOOK-01", "FINGERPRINT-MAC-A8B9C0D1", "USR-CUST-1001", "DESKTOP", "macOS 14.5", "Chrome 125.0", "198.51.100.12", "US", "New York"),
            ("DEV-IPHONE-01", "FINGERPRINT-IPH-E2F3G4H5", "USR-CUST-1001", "MOBILE", "iOS 17.4", "Mobile Safari", "198.51.100.15", "US", "New York"),
            ("DEV-WIN-01", "FINGERPRINT-WIN-I6J7K8L9", "USR-CUST-1002", "DESKTOP", "Windows 11", "Edge 124.0", "203.0.113.45", "US", "San Francisco"),
            ("DEV-ANDROID-01", "FINGERPRINT-AND-M0N1O2P3", "USR-CUST-1003", "MOBILE", "Android 14", "Chrome Mobile", "192.0.2.78", "US", "Chicago"),
            ("DEV-BOT-01", "FINGERPRINT-TOR-Q4R5S6T7", None, "BOT", "Linux / Headless", "Headless Chrome", "185.220.101.5", "RU", "Moscow")
        ]

        device_map = {}
        for d_id, identifier, u_id, d_type, os_name, browser, ip, country, city in devices_spec:
            stmt = select(Device).where(Device.id == d_id)
            d_obj = (await session.execute(stmt)).scalar_one_or_none()
            if not d_obj:
                d_obj = Device(
                    id=d_id,
                    device_identifier=identifier,
                    user_id=u_id,
                    device_type=d_type,
                    operating_system=os_name,
                    browser=browser,
                    ip_address=ip,
                    country=country,
                    city=city,
                    is_active=True
                )
                session.add(d_obj)
            device_map[d_id] = d_obj
        await session.flush()

        # 6. Seed Fraud Rules and Versions
        rules_spec = [
            ("HIGH_AMOUNT", "High Transaction Amount", "Flags transactions exceeding 5x customer average or above $5,000", "AMOUNT", "HIGH", 25.0, 5000.0, {"multiplier": 5.0, "min_amount": 500.0}),
            ("RAPID_TRANSACTIONS", "Rapid Velocity Burst", "Flags 4 or more rapid transactions within 5 minutes", "VELOCITY", "HIGH", 25.0, 4.0, {"max_txns_5m": 4}),
            ("NEW_DEVICE", "Unseen Novel Device", "Flags transactions originating from unverified device fingerprints", "DEVICE", "MEDIUM", 20.0, 1.0, {}),
            ("UNUSUAL_LOCATION", "Impossible Travel Velocity", "Flags geographical location hops exceeding 700 km/h", "LOCATION", "HIGH", 30.0, 700.0, {"max_geo_speed_kmh": 700.0}),
            ("UNUSUAL_TIME", "Off-Hours Activity", "Flags high-value activity during overnight hours (01:00-05:00 UTC)", "TIME", "LOW", 15.0, 1.0, {"night_start": 1, "night_end": 5}),
            ("FAILED_ATTEMPTS", "Authentication Attempt Spike", "Flags repeated failed CVV/PIN authorizations preceding transaction", "FAILED_ATTEMPTS", "HIGH", 25.0, 2.0, {"max_failed_attempts": 2}),
            ("SUDDEN_SPENDING_INCREASE", "Sudden Spending Velocity Spike", "Flags sudden sharp surge in hourly spend compared to historic baseline", "BEHAVIOR", "MEDIUM", 20.0, 3.0, {"spending_multiplier": 3.0}),
            ("MERCHANT_ANOMALY", "High-Risk Merchant Category Deviation", "Elevates risk for cryptocurrency, casino, and high-risk merchants", "MERCHANT", "HIGH", 25.0, 1.0, {"high_risk_categories": ["Crypto & Exchange", "Gambling & Casino"]}),
            ("BEHAVIOR_DEVIATION", "Compound Behavioral Deviation", "Detects simultaneous novel device, location leap, and elevated amount.", "BEHAVIOR", "CRITICAL", 35.0, 1.0, {})
        ]

        rule_map = {}
        rule_ver_map = {}
        for r_id, r_name, r_desc, cat, sev, weight, threshold, cfg in rules_spec:
            stmt = select(FraudRule).where(FraudRule.id == r_id)
            r_obj = (await session.execute(stmt)).scalar_one_or_none()
            if not r_obj:
                r_obj = FraudRule(
                    id=r_id,
                    rule_code=r_id,
                    name=r_name,
                    description=r_desc,
                    category=cat,
                    default_severity=sev,
                    is_active=True,
                    weight=weight,
                    condition_config=cfg
                )
                session.add(r_obj)
                await session.flush()
                
                # Create version 1.0
                v_obj = FraudRuleVersion(
                    id=str(uuid.uuid4()),
                    rule_id=r_obj.id,
                    version="1.0",
                    configuration=cfg,
                    threshold=threshold,
                    weight=weight,
                    is_active=True,
                    created_by="system"
                )
                session.add(v_obj)
                await session.flush()
                rule_ver_map[r_id] = v_obj
            rule_map[r_id] = r_obj
        await session.flush()

        # 7. Seed Model Versions
        m_version = "v1.0.0"
        m_stmt = select(MLModelRegistry).where(MLModelRegistry.version == m_version)
        model_obj = (await session.execute(m_stmt)).scalar_one_or_none()
        if not model_obj:
            model_obj = MLModelRegistry(
                id=f"MODEL-ISOFOREST-{m_version}",
                model_name="IsolationForest_AnomalyDetector",
                version=m_version,
                algorithm="Isolation Forest",
                status="DEPLOYED",
                feature_version="v1.0",
                training_dataset="synthetic_financial_fraud_v1.csv",
                parameters={"n_estimators": 150, "contamination": 0.05, "random_state": 42},
                metrics={"precision": 0.892, "recall": 0.991, "f1_score": 0.938, "roc_auc": 0.999},
                drift_metrics={"psi": 0.018, "feature_drift_detected": False, "drift_score": 0.008},
                artifact_path="ml/saved_models/isolation_forest_v1.0.0.joblib",
                description="Production baseline Isolation Forest model trained on multivariate behavioral features.",
                trained_at=utc_now() - timedelta(days=30),
                approved_at=utc_now() - timedelta(days=28),
                deployed_at=utc_now() - timedelta(days=27)
            )
            session.add(model_obj)
            await session.flush()

        # 8. Seed Synthetic Transactions & Associated Entities
        now = utc_now()
        transactions_spec = [
            # 1. Normal grocery purchase
            {
                "id": "TXN-10001", "user_id": "USR-CUST-1001", "merchant_id": "MERCH-AMAZON", "device_id": "DEV-MACBOOK-01",
                "amount": 42.50, "currency": "USD", "payment_method": "CREDIT_CARD", "merchant_name": "Amazon Web Retail",
                "merchant_category": "Electronics & Retail", "country": "US", "city": "New York", "lat": 40.7128, "lon": -74.0060,
                "ip": "198.51.100.12", "time_offset_m": 60, "status": "COMPLETED", "score": 12.0, "risk_level": "LOW",
                "ml_score": 0.05, "rules_triggered": [], "failed_attempts": 0
            },
            # 2. High amount luxury purchase
            {
                "id": "TXN-10002", "user_id": "USR-CUST-1001", "merchant_id": "MERCH-GUCCI", "device_id": "DEV-IPHONE-01",
                "amount": 6850.00, "currency": "USD", "payment_method": "CREDIT_CARD", "merchant_name": "Gucci Fifth Avenue",
                "merchant_category": "Luxury Goods", "country": "US", "city": "New York", "lat": 40.7128, "lon": -74.0060,
                "ip": "198.51.100.15", "time_offset_m": 45, "status": "COMPLETED", "score": 68.0, "risk_level": "MEDIUM",
                "ml_score": 0.45, "rules_triggered": ["HIGH_AMOUNT"], "failed_attempts": 0
            },
            # 3. New device crypto transaction from high-risk IP
            {
                "id": "TXN-10003", "user_id": "USR-CUST-1002", "merchant_id": "MERCH-BINANCE", "device_id": "DEV-BOT-01",
                "amount": 9400.00, "currency": "USD", "payment_method": "WIRE", "merchant_name": "Binance Global Exchange",
                "merchant_category": "Crypto & Exchange", "country": "RU", "city": "Moscow", "lat": 55.7558, "lon": 37.6173,
                "ip": "185.220.101.5", "time_offset_m": 25, "status": "DECLINED", "score": 94.0, "risk_level": "CRITICAL",
                "ml_score": 0.92, "rules_triggered": ["HIGH_AMOUNT", "NEW_DEVICE", "UNUSUAL_LOCATION", "MERCHANT_ANOMALY"], "failed_attempts": 3
            },
            # 4. Rapid velocity series
            {
                "id": "TXN-10004", "user_id": "USR-CUST-1003", "merchant_id": "MERCH-STEAM", "device_id": "DEV-ANDROID-01",
                "amount": 120.00, "currency": "USD", "payment_method": "DEBIT_CARD", "merchant_name": "Steam Gaming Platform",
                "merchant_category": "Digital Goods", "country": "US", "city": "Chicago", "lat": 41.8781, "lon": -87.6298,
                "ip": "192.0.2.78", "time_offset_m": 10, "status": "COMPLETED", "score": 74.0, "risk_level": "HIGH",
                "ml_score": 0.62, "rules_triggered": ["RAPID_TRANSACTIONS"], "failed_attempts": 1
            },
            # 5. Casino anomalous transaction
            {
                "id": "TXN-10005", "user_id": "USR-CUST-1001", "merchant_id": "MERCH-CASINO", "device_id": "DEV-BOT-01",
                "amount": 15000.00, "currency": "EUR", "payment_method": "WIRE", "merchant_name": "Monte Carlo Royale",
                "merchant_category": "Gambling & Casino", "country": "MC", "city": "Monaco", "lat": 43.7384, "lon": 7.4246,
                "ip": "185.220.101.5", "time_offset_m": 5, "status": "DECLINED", "score": 98.0, "risk_level": "CRITICAL",
                "ml_score": 0.97, "rules_triggered": ["HIGH_AMOUNT", "NEW_DEVICE", "UNUSUAL_LOCATION", "MERCHANT_ANOMALY", "UNUSUAL_TIME"], "failed_attempts": 4
            }
        ]

        txn_map = {}
        for t_data in transactions_spec:
            t_stmt = select(Transaction).where(Transaction.id == t_data["id"])
            txn_obj = (await session.execute(t_stmt)).scalar_one_or_none()
            t_time = now - timedelta(minutes=t_data["time_offset_m"])
            if not txn_obj:
                txn_obj = Transaction(
                    id=t_data["id"],
                    transaction_id=t_data["id"],
                    user_id=t_data["user_id"],
                    merchant_id=t_data["merchant_id"],
                    device_id=t_data["device_id"],
                    amount=t_data["amount"],
                    currency=t_data["currency"],
                    transaction_type="PURCHASE",
                    payment_method=t_data["payment_method"],
                    merchant_name=t_data["merchant_name"],
                    merchant_category=t_data["merchant_category"],
                    country=t_data["country"],
                    city=t_data["city"],
                    latitude=t_data["lat"],
                    longitude=t_data["lon"],
                    ip_address=t_data["ip"],
                    transaction_timestamp=t_time,
                    timestamp=t_time,
                    status=t_data["status"],
                    source="API",
                    failed_attempts=t_data["failed_attempts"],
                    risk_score=t_data["score"],
                    risk_level=t_data["risk_level"],
                    ml_anomaly_score=t_data["ml_score"],
                    rules_triggered=t_data["rules_triggered"],
                    risk_factors=[f"Rule {r} triggered" for r in t_data["rules_triggered"]],
                    created_at=t_time
                )
                session.add(txn_obj)
                await session.flush()

                # Feature snapshot
                f_snap = FeatureSnapshot(
                    id=str(uuid.uuid4()),
                    transaction_id=txn_obj.id,
                    features={
                        "amount_scaled": t_data["amount"] / 100.0,
                        "is_night_time": 1 if t_time.hour < 6 else 0,
                        "failed_attempts": t_data["failed_attempts"],
                        "country_mismatch": 1 if t_data["country"] != "US" else 0
                    },
                    created_at=t_time
                )
                session.add(f_snap)

                # ML Prediction
                pred_label = "ANOMALOUS" if t_data["score"] > 60 else "NORMAL"
                ml_pred = MLPrediction(
                    id=str(uuid.uuid4()),
                    transaction_id=txn_obj.id,
                    model_version_id=model_obj.id,
                    anomaly_score=t_data["ml_score"],
                    prediction=pred_label,
                    confidence=0.96,
                    feature_snapshot={"amount": t_data["amount"], "ml_score": t_data["ml_score"]},
                    inference_time_ms=1.45,
                    created_at=t_time
                )
                session.add(ml_pred)

                # Risk Score (0-100)
                r_score = RiskScore(
                    id=str(uuid.uuid4()),
                    transaction_id=txn_obj.id,
                    score=t_data["score"],
                    risk_level=t_data["risk_level"],
                    rule_score=float(len(t_data["rules_triggered"]) * 25),
                    ml_score=t_data["ml_score"] * 100,
                    behavior_score=t_data["score"] * 0.3,
                    explanation=[{"signal": r, "weight": 25.0} for r in t_data["rules_triggered"]],
                    scoring_version="v1.0",
                    created_at=t_time
                )
                session.add(r_score)
                await session.flush()

                # Rule executions
                for r_code in t_data["rules_triggered"]:
                    if r_code in rule_map:
                        r_exec = RuleExecution(
                            id=str(uuid.uuid4()),
                            transaction_id=txn_obj.id,
                            rule_id=rule_map[r_code].id,
                            rule_version_id=rule_ver_map.get(r_code, FraudRuleVersion(id=str(uuid.uuid4()))).id if r_code in rule_ver_map else None,
                            triggered=True,
                            score=25.0,
                            reason=f"Rule {r_code} criteria matched during transaction evaluation.",
                            execution_time_ms=0.35,
                            points_awarded=25.0,
                            created_at=t_time
                        )
                        session.add(r_exec)

            txn_map[t_data["id"]] = txn_obj
        await session.flush()

        # 9. Seed Alerts
        alerts_spec = [
            ("ALT-001", "TXN-10003", "USR-CUST-1002", "CRITICAL", 94.0, "Impossible Travel & Novel Device Crypto Outflow", "NEW", "analyst@fraudshield.io"),
            ("ALT-002", "TXN-10004", "USR-CUST-1003", "HIGH", 74.0, "Rapid Velocity Gaming Card Burst", "INVESTIGATING", "analyst@fraudshield.io"),
            ("ALT-003", "TXN-10005", "USR-CUST-1001", "CRITICAL", 98.0, "Offshore Casino High-Value Anomaly", "ACKNOWLEDGED", "analyst@fraudshield.io"),
            ("ALT-004", "TXN-10002", "USR-CUST-1001", "MEDIUM", 68.0, "Elevated Luxury Purchase Amount", "RESOLVED", "analyst@fraudshield.io")
        ]

        alert_map = {}
        for a_id, t_id, u_id, sev, score, title, status, assigned_email in alerts_spec:
            a_stmt = select(Alert).where(Alert.id == a_id)
            a_obj = (await session.execute(a_stmt)).scalar_one_or_none()
            if not a_obj and t_id in txn_map:
                a_obj = Alert(
                    id=a_id,
                    alert_id=a_id,
                    transaction_id=t_id,
                    user_id=u_id,
                    severity=sev,
                    risk_score=score,
                    title=title,
                    description=f"Automated risk engine alert for {title}. Multi-signal anomaly score reached {score}/100.",
                    status=status,
                    assigned_to="USR-ANALYST-01",
                    alert_reason=title,
                    triggered_rules=txn_map[t_id].rules_triggered or [],
                    model_version="v1.0.0",
                    created_at=now - timedelta(minutes=20)
                )
                session.add(a_obj)
            alert_map[a_id] = a_obj
        await session.flush()

        # 10. Seed Cases with Alerts, Transactions, Notes, Evidence, and History
        cases_spec = [
            ("CASE-1001", "Cryptocurrency Account Takeover Investigation", "Investigating severe unauthorized crypto outflow via novel Russian IP endpoint.", "CRITICAL", "INVESTIGATING", "USR-ANALYST-01", "USR-CUST-1002", ["ALT-001"], ["TXN-10003"]),
            ("CASE-1002", "Gaming Micro-transaction Velocity Attack", "Investigating rapid carding attempt across gaming merchants.", "HIGH", "OPEN", "USR-ANALYST-01", "USR-CUST-1003", ["ALT-002"], ["TXN-10004"])
        ]

        for c_id, title, desc, sev, status, assigned_id, subj_id, alt_ids, t_ids in cases_spec:
            c_stmt = select(Case).where(Case.id == c_id)
            c_obj = (await session.execute(c_stmt)).scalar_one_or_none()
            if not c_obj:
                c_obj = Case(
                    id=c_id,
                    case_id=c_id,
                    title=title,
                    description=desc,
                    severity=sev,
                    status=status,
                    assigned_to=assigned_id,
                    user_id=subj_id,
                    created_by="USR-ADMIN-01",
                    risk_score=94.0 if sev == "CRITICAL" else 74.0,
                    created_at=now - timedelta(hours=2)
                )
                session.add(c_obj)
                await session.flush()

                # Direct association table inserts
                for alt_id in alt_ids:
                    if alt_id in alert_map:
                        await session.execute(
                            insert(case_alerts).values(
                                case_id=c_obj.id,
                                alert_id=alt_id,
                                created_at=now - timedelta(hours=2)
                            )
                        )

                for tx_id in t_ids:
                    if tx_id in txn_map:
                        await session.execute(
                            insert(case_transactions).values(
                                case_id=c_obj.id,
                                transaction_id=tx_id,
                                created_at=now - timedelta(hours=2)
                            )
                        )

                # Case Note
                c_note = CaseNote(
                    id=str(uuid.uuid4()),
                    case_id=c_obj.id,
                    author_id="USR-ANALYST-01",
                    author="Elena Rostova (Analyst)",
                    content="Verified geographic inconsistency. Customer resides in San Francisco, login originated from Moscow IP within 15 minutes of prior login.",
                    created_at=now - timedelta(hours=1, minutes=30)
                )
                session.add(c_note)

                # Case Evidence
                c_evidence = CaseEvidence(
                    id=str(uuid.uuid4()),
                    case_id=c_obj.id,
                    title="IP Geolocation and ASN Telemetry",
                    description="TOR exit node IP 185.220.101.5 associated with known botnet infrastructure.",
                    evidence_type="IP_GEO",
                    metadata_json={"ip": "185.220.101.5", "asn": "AS9009", "isp": "M247 Ltd", "country": "RU"},
                    uploaded_by="Elena Rostova",
                    created_at=now - timedelta(hours=1, minutes=15)
                )
                session.add(c_evidence)

                # Case History
                c_hist1 = CaseHistory(
                    id=str(uuid.uuid4()),
                    case_id=c_obj.id,
                    action="CASE_CREATED",
                    from_status=None,
                    to_status="OPEN",
                    note="System automatically generated case from CRITICAL alert ALT-001.",
                    actor_id="USR-ADMIN-01",
                    actor_name="Alex Mercer",
                    created_at=now - timedelta(hours=2)
                )
                c_hist2 = CaseHistory(
                    id=str(uuid.uuid4()),
                    case_id=c_obj.id,
                    action="STATUS_CHANGED",
                    from_status="OPEN",
                    to_status="INVESTIGATING",
                    note="Assigned to Elena Rostova for immediate account freeze & customer outreach.",
                    actor_id="USR-ANALYST-01",
                    actor_name="Elena Rostova",
                    created_at=now - timedelta(hours=1, minutes=45)
                )
                session.add(c_hist1)
                session.add(c_hist2)

        await session.flush()

        # 11. Seed Risk Profiles
        # User risk profiles
        for u_id in ["USR-CUST-1001", "USR-CUST-1002", "USR-CUST-1003"]:
            u_p_stmt = select(UserRiskProfile).where(UserRiskProfile.user_id == u_id)
            if not (await session.execute(u_p_stmt)).scalar_one_or_none():
                session.add(UserRiskProfile(
                    id=str(uuid.uuid4()),
                    user_id=u_id,
                    average_transaction_amount=185.50,
                    transaction_count=24,
                    usual_country="US",
                    usual_city="New York" if u_id == "USR-CUST-1001" else "San Francisco",
                    usual_transaction_hours=[9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
                    known_device_count=2,
                    known_merchant_count=8,
                    risk_score=25.0 if u_id == "USR-CUST-1001" else 88.0,
                    risk_level="LOW" if u_id == "USR-CUST-1001" else "HIGH",
                    last_calculated_at=now
                ))

        # Device risk profiles
        for d_id, d_data in device_map.items():
            d_p_stmt = select(DeviceRiskProfile).where(DeviceRiskProfile.device_id == d_id)
            if not (await session.execute(d_p_stmt)).scalar_one_or_none():
                is_bot = "BOT" in d_id
                session.add(DeviceRiskProfile(
                    id=str(uuid.uuid4()),
                    device_id=d_id,
                    transaction_count=50 if not is_bot else 8,
                    failed_transaction_count=0 if not is_bot else 7,
                    associated_user_count=1 if not is_bot else 5,
                    risk_score=5.0 if not is_bot else 98.0,
                    risk_level="LOW" if not is_bot else "CRITICAL",
                    is_blacklisted="FALSE" if not is_bot else "TRUE",
                    last_calculated_at=now
                ))

        # Merchant risk profiles
        for m_id, m_data in merchant_map.items():
            m_p_stmt = select(MerchantRiskProfile).where(MerchantRiskProfile.merchant_id == m_id)
            if not (await session.execute(m_p_stmt)).scalar_one_or_none():
                session.add(MerchantRiskProfile(
                    id=str(uuid.uuid4()),
                    merchant_id=m_id,
                    transaction_count=120,
                    alert_count=2 if m_data.risk_level != "CRITICAL" else 15,
                    fraud_count=0 if m_data.risk_level != "CRITICAL" else 4,
                    risk_score=10.0 if m_data.risk_level == "LOW" else (50.0 if m_data.risk_level == "MEDIUM" else 90.0),
                    risk_level=m_data.risk_level,
                    base_risk_tier=m_data.risk_level,
                    last_calculated_at=now
                ))

        await session.flush()

        # 12. Seed System Settings
        settings_seed = [
            ("risk_threshold_low", 30, "Maximum score threshold for LOW risk tier (0-30)"),
            ("risk_threshold_medium", 70, "Score threshold for MEDIUM risk tier (31-70)"),
            ("risk_threshold_high", 90, "Score threshold for HIGH risk tier (71-90)"),
            ("alert_cooldown_seconds", 300, "Cooldown window in seconds to suppress duplicate alert storms"),
            ("auto_block_threshold", 95, "Risk score above which transactions are automatically blocked"),
            ("system_mode", "ACTIVE_DEFENSE", "Operational mode of the fraud engine")
        ]
        for k, v, desc in settings_seed:
            chk_s = await session.execute(select(SystemSetting).where(SystemSetting.key == k))
            if not chk_s.scalar_one_or_none():
                session.add(SystemSetting(id=str(uuid.uuid4()), key=k, value=v, description=desc, updated_by="system"))

        # 13. Seed Audit Logs
        audit_seed = [
            ("USR-ADMIN-01", "admin@fraudshield.io", "ADMIN", "SETTINGS_CHANGED", "SystemSetting", "auto_block_threshold", "SUCCESS", "198.51.100.1", "Threshold set to 95"),
            ("USR-ANALYST-01", "analyst@fraudshield.io", "ANALYST", "ALERT_ASSIGNED", "Alert", "ALT-001", "SUCCESS", "198.51.100.2", "Assigned ALT-001 to self for triage"),
            ("USR-ANALYST-01", "analyst@fraudshield.io", "ANALYST", "CASE_UPDATED", "Case", "CASE-1001", "SUCCESS", "198.51.100.2", "Added telemetry evidence and updated status to INVESTIGATING"),
            ("USR-ADMIN-01", "admin@fraudshield.io", "ADMIN", "MODEL_APPROVED", "MLModelRegistry", "MODEL-ISOFOREST-v1.0.0", "SUCCESS", "198.51.100.1", "Production approval granted for baseline Isolation Forest detector")
        ]
        for act_id, email, role_name, action, ent_type, ent_id, result, ip, details in audit_seed:
            session.add(AuditLog(
                id=str(uuid.uuid4()),
                actor_user_id=act_id,
                actor_email=email,
                actor_role=role_name,
                action=action,
                entity_type=ent_type,
                entity_id=ent_id,
                result=result,
                ip_address=ip,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0",
                details=details,
                created_at=now - timedelta(hours=3)
            ))

        await session.commit()
        print("[+] Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
