"""
Comprehensive Test Suite for Section 06 — Feature Engineering Engine.
Tests:
- Centralized Feature Registry & Versioning
- Amount Calculations & Deviations
- Sliding Window Velocity Calculations & Boundaries
- Geographic Haversine Distance & Geo-Hop Velocities
- Device & Location Novelty Metrics
- Cyclical Temporal Features & Behavioral Unusual Hours
- Merchant & Payment Instrument Behavior
- Cold-Start Handling & Zero-History Fallbacks
- Missing Value Safety (No NaN / No Infinity)
- Feature Validation & Data Quality Diagnostics
- MANDATORY DATA LEAKAGE TEST (T1, T2, T3)
- Determinism & Reproducibility Test
- Feature Retrieval & Recomputation API Endpoints
- Feature Extraction Performance Benchmark
"""
import uuid
import math
import time
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.core.database import AsyncSessionLocal
from backend.app.engine.features import (
    FEATURE_VERSION,
    FEATURE_REGISTRY,
    get_feature_definition,
    list_features_by_category,
    FeatureCategory,
    FeatureEngineeringService,
    validate_feature_dict,
    generate_feature_quality_report
)
from backend.app.engine.features.amount import calculate_amount_features
from backend.app.engine.features.velocity import calculate_velocity_features
from backend.app.engine.features.location import haversine_distance_km, calculate_location_features
from backend.app.engine.features.time import calculate_time_features
from backend.app.models.transaction import Transaction

@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
def analyst_headers():
    token = create_access_token({
        "sub": "USR-ANALYST-01",
        "email": "analyst@fraudshield.io",
        "role": "analyst",
        "username": "analyst"
    })
    return {"Authorization": f"Bearer {token}"}

# ---------------------------------------------------------------------------
# 1. Feature Registry & Metadata Tests
# ---------------------------------------------------------------------------
def test_feature_registry_metadata_and_version():
    assert FEATURE_VERSION == "v1.0.0"
    assert len(FEATURE_REGISTRY) >= 30
    
    amount_def = get_feature_definition("amount")
    assert amount_def is not None
    assert amount_def.category == FeatureCategory.AMOUNT
    assert amount_def.version == "v1.0.0"

    velocity_defs = list_features_by_category(FeatureCategory.VELOCITY)
    assert len(velocity_defs) >= 5

# ---------------------------------------------------------------------------
# 2. Amount Feature Calculations & Deviation Formulas
# ---------------------------------------------------------------------------
def test_amount_feature_calculations():
    # Case 1: Standard deviation
    res = calculate_amount_features(
        amount=300.0,
        user_baseline=100.0,
        past_amounts=[100.0, 100.0, 100.0]
    )
    assert res["amount"] == 300.0
    assert res["user_average_transaction_amount"] == 100.0
    assert res["amount_deviation"] == 3.0
    assert res["amount_deviation_from_user_average"] == 2.0  # (300 - 100) / 100 = 2.0
    assert res["user_max_transaction_amount"] == 100.0

    # Case 2: Cold-start (0 past amounts)
    cold_res = calculate_amount_features(
        amount=150.0,
        user_baseline=100.0,
        past_amounts=[]
    )
    assert cold_res["amount"] == 150.0
    assert cold_res["user_average_transaction_amount"] == 100.0
    assert cold_res["amount_deviation"] == 1.5

# ---------------------------------------------------------------------------
# 3. Sliding-Window Velocity Calculations
# ---------------------------------------------------------------------------
def test_velocity_sliding_windows():
    now = datetime(2026, 9, 21, 12, 0, 0, tzinfo=timezone.utc)
    
    past_txs = [
        (now - timedelta(seconds=30), 50.0),   # In 1m, 5m, 10m, 1h, 24h
        (now - timedelta(minutes=3), 75.0),    # In 5m, 10m, 1h, 24h
        (now - timedelta(minutes=8), 100.0),   # In 10m, 1h, 24h
        (now - timedelta(minutes=30), 200.0),  # In 1h, 24h
        (now - timedelta(hours=3), 500.0),     # In 24h
        (now - timedelta(hours=30), 1000.0),   # Outside 24h window
    ]

    vel = calculate_velocity_features(current_time=now, recent_transactions=past_txs)
    assert vel["velocity_1m"] == 1
    assert vel["velocity_5m"] == 2
    assert vel["velocity_10m"] == 3
    assert vel["velocity_1h"] == 4
    assert vel["velocity_24h"] == 5
    assert vel["volume_1m"] == 50.0
    assert vel["volume_5m"] == 125.0
    assert vel["volume_10m"] == 225.0
    assert vel["volume_1h"] == 425.0
    assert vel["volume_24h"] == 925.0

# ---------------------------------------------------------------------------
# 4. Haversine Distance & Impossible Speed Geo-Hop
# ---------------------------------------------------------------------------
def test_haversine_distance_and_geohop():
    # London (51.5074, -0.1278) to New York (40.7128, -74.0060) ~ 5570 km
    dist = haversine_distance_km(51.5074, -0.1278, 40.7128, -74.0060)
    assert 5500 < dist < 5650

    now = datetime(2026, 9, 21, 12, 0, 0, tzinfo=timezone.utc)
    prev_time = now - timedelta(minutes=10) # 10 minutes ago
    prev_loc = (51.5074, -0.1278, prev_time, "London", "GB")

    loc_res = calculate_location_features(
        country="US",
        city="New York",
        latitude=40.7128,
        longitude=-74.0060,
        current_time=now,
        known_countries=["GB"],
        known_cities=["London"],
        last_tx_location=prev_loc
    )

    assert loc_res["is_new_country"] == 1
    assert loc_res["is_new_city"] == 1
    assert loc_res["distance_from_previous_location_km"] > 5500
    # Travel speed 5570 km in 10 minutes = ~33,420 km/h (impossible travel)
    assert loc_res["geo_hop_speed_kmh"] > 800.0
    assert loc_res["is_unusual_location"] == 1

# ---------------------------------------------------------------------------
# 5. Temporal & Cyclical Trigonometric Features
# ---------------------------------------------------------------------------
def test_time_features():
    # Wednesday 14:00 UTC
    dt = datetime(2026, 9, 23, 14, 0, 0, tzinfo=timezone.utc)
    time_res = calculate_time_features(timestamp=dt, historical_hours=[12, 13, 14, 15, 16])
    
    assert time_res["hour_of_day"] == 14
    assert time_res["day_of_week"] == 2 # Wednesday
    assert time_res["is_weekend"] == 0
    assert time_res["is_night"] == 0
    assert -1.0 <= time_res["hour_sin"] <= 1.0
    assert -1.0 <= time_res["hour_cos"] <= 1.0

# ---------------------------------------------------------------------------
# 6. Feature Validation & Diagnostics Report
# ---------------------------------------------------------------------------
def test_feature_validation_and_diagnostics():
    valid_features = {
        "amount": 100.0,
        "velocity_5m": 2,
        "is_new_device": 1,
        "amount_deviation": 1.25,
        "feature_version": "v1.0.0"
    }
    is_valid, errors = validate_feature_dict(valid_features)
    assert is_valid
    assert len(errors) == 0

    report = generate_feature_quality_report(valid_features)
    assert report["is_valid"] is True
    assert report["nan_count"] == 0
    assert report["infinity_count"] == 0

    # Invalid feature test (NaN / negative counts)
    invalid_features = {
        "amount": float("nan"),
        "velocity_5m": -5,
        "is_new_device": 999
    }
    is_bad_valid, bad_errors = validate_feature_dict(invalid_features)
    assert not is_bad_valid
    assert len(bad_errors) == 3

# ---------------------------------------------------------------------------
# 7. MANDATORY DATA LEAKAGE TEST (T1, T2, T3)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_data_leakage_prevention():
    """
    CRITICAL: For transactions T1 (10:00), T2 (10:15), T3 (10:30):
    When calculating features for T2:
    - T1 must be included in historical baseline.
    - T3 must NOT influence T2 features in any way.
    """
    user_id = f"USR-LEAK-TEST-{uuid.uuid4().hex[:6]}"
    
    t1_time = datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc)
    t2_time = datetime(2026, 9, 21, 10, 15, 0, tzinfo=timezone.utc)
    t3_time = datetime(2026, 9, 21, 10, 30, 0, tzinfo=timezone.utc)

    async with AsyncSessionLocal() as session:
        # Step 1: Insert T1 ($100.00)
        t1 = Transaction(
            id=f"TXN-T1-{uuid.uuid4().hex[:6]}",
            transaction_id=f"TXN-T1-{uuid.uuid4().hex[:6]}",
            user_id=user_id,
            amount=100.0,
            currency="USD",
            merchant_name="Merchant A",
            payment_method="CREDIT_CARD",
            device_id="DEV-1",
            status="COMPLETED",
            transaction_timestamp=t1_time,
            timestamp=t1_time
        )
        session.add(t1)
        await session.commit()

        # Step 2: Compute features for T2 ($200.00) BEFORE T3 exists
        t2_dict = {
            "user_id": user_id,
            "amount": 200.0,
            "transaction_id": f"TXN-T2-{uuid.uuid4().hex[:6]}",
            "device_id": "DEV-1",
            "merchant_name": "Merchant A",
            "timestamp": t2_time.isoformat()
        }
        feats_before_t3 = await FeatureEngineeringService.extract_features(session, t2_dict, reference_time=t2_time)
        
        assert feats_before_t3["user_transaction_count"] == 1  # Sees T1
        assert feats_before_t3["user_total_spend"] == 100.0   # T1 amount
        assert feats_before_t3["velocity_1h"] == 1            # T1 in last 1h

        # Step 3: Insert T3 ($9999.00 - Future massive anomaly)
        t3 = Transaction(
            id=f"TXN-T3-{uuid.uuid4().hex[:6]}",
            transaction_id=f"TXN-T3-{uuid.uuid4().hex[:6]}",
            user_id=user_id,
            amount=9999.0,
            currency="USD",
            merchant_name="Crypto Drain",
            payment_method="CREDIT_CARD",
            device_id="DEV-ROGUE",
            status="COMPLETED",
            transaction_timestamp=t3_time,
            timestamp=t3_time
        )
        session.add(t3)
        await session.commit()

        # Step 4: Re-compute features for T2 at t2_time AFTER T3 exists in DB
        feats_after_t3 = await FeatureEngineeringService.extract_features(session, t2_dict, reference_time=t2_time)

        # STRICT ASSERTIONS: T3 must NOT have leaked into T2 features!
        assert feats_after_t3["user_transaction_count"] == 1  # Must still be 1 (T3 excluded)
        assert feats_after_t3["user_total_spend"] == 100.0   # Must not include $9999
        assert feats_after_t3["velocity_1h"] == 1            # Must not count T3
        assert feats_after_t3["user_max_transaction_amount"] == 100.0 # Must not be 9999.0
        assert feats_after_t3["amount_deviation_from_user_average"] == feats_before_t3["amount_deviation_from_user_average"]

# ---------------------------------------------------------------------------
# 8. Determinism & Reproducibility Test
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_feature_extraction_determinism():
    txn_dict = {
        "user_id": "USR-CUST-1001",
        "amount": 175.50,
        "currency": "USD",
        "merchant_name": "Amazon Web Retail",
        "merchant_category": "Electronics & Retail",
        "payment_method": "CREDIT_CARD",
        "device_id": "DEV-MACBOOK-01",
        "city": "London",
        "country": "GB",
        "latitude": 51.5074,
        "longitude": -0.1278,
        "timestamp": "2026-09-21T14:30:00Z"
    }

    async with AsyncSessionLocal() as session:
        f1 = await FeatureEngineeringService.extract_features(session, txn_dict)
        f2 = await FeatureEngineeringService.extract_features(session, txn_dict)

        # Remove timestamp of execution for comparison
        f1_copy = {k: v for k, v in f1.items() if k != "computed_at"}
        f2_copy = {k: v for k, v in f2.items() if k != "computed_at"}

        assert f1_copy == f2_copy

# ---------------------------------------------------------------------------
# 9. Feature Snapshot Retrieval & Recomputation API Endpoints
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_get_and_recompute_feature_endpoints(client: AsyncClient, analyst_headers: dict):
    # Ingest a valid transaction first
    txn_id = f"TXN-FEAT-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "transaction_id": txn_id,
        "user_id": "USR-CUST-1001",
        "amount": 220.0,
        "currency": "USD",
        "merchant_name": "Apple Store Online",
        "device_id": "DEV-MACBOOK-01"
    }
    ingest_res = await client.post("/api/v1/transactions", json=payload, headers=analyst_headers)
    assert ingest_res.status_code == 200

    # Test GET /transactions/{id}/features
    feat_res = await client.get(f"/api/v1/transactions/{txn_id}/features", headers=analyst_headers)
    assert feat_res.status_code == 200
    feat_data = feat_res.json()
    assert feat_data["transaction_id"] == txn_id
    assert feat_data["feature_version"] == "v1.0.0"
    assert "features" in feat_data
    assert "amount_deviation" in feat_data["features"]
    assert "velocity_5m" in feat_data["features"]

    # Test POST /transactions/{id}/recompute-features
    recomp_res = await client.post(f"/api/v1/transactions/{txn_id}/recompute-features", headers=analyst_headers)
    assert recomp_res.status_code == 200
    recomp_data = recomp_res.json()
    assert recomp_data["transaction_id"] == txn_id
    assert recomp_data["feature_version"] == "v1.0.0"

# ---------------------------------------------------------------------------
# 10. Feature Extraction Micro-Benchmark
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_feature_extraction_performance_benchmark():
    async with AsyncSessionLocal() as session:
        txn_dict = {
            "user_id": "USR-CUST-1001",
            "amount": 100.0,
            "currency": "USD",
            "merchant_name": "Amazon Web Retail",
            "device_id": "DEV-MACBOOK-01",
            "city": "London",
            "country": "GB",
            "latitude": 51.5074,
            "longitude": -0.1278
        }
        
        count = 30
        start = time.time()
        for _ in range(count):
            feats = await FeatureEngineeringService.extract_features(session, txn_dict)
            assert feats["feature_version"] == "v1.0.0"
        
        elapsed = time.time() - start
        avg_ms = (elapsed / count) * 1000
        print(f"\n[FEATURE BENCHMARK] Extracted {count} feature snapshots in {elapsed:.3f}s (Avg: {avg_ms:.2f}ms/snapshot)")
        assert avg_ms < 50.0 # Under 50ms per feature extraction locally
