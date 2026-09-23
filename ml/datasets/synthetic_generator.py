"""
Synthetic Transaction Dataset Generator for ML Training & Evaluation.
Generates realistic financial transaction streams with engineered normal baselines and realistic fraud vectors.
"""
import uuid
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone

MERCHANT_CATEGORIES = [
    "grocery", "electronics", "travel", "dining", "entertainment",
    "luxury_goods", "crypto_exchange", "online_retail", "fuel", "utilities"
]

HIGH_RISK_CATEGORIES = {"crypto_exchange", "luxury_goods", "travel"}

CITIES = [
    {"city": "New York", "lat": 40.7128, "lon": -74.0060, "country": "US"},
    {"city": "London", "lat": 51.5074, "lon": -0.1278, "country": "GB"},
    {"city": "San Francisco", "lat": 37.7749, "lon": -122.4194, "country": "US"},
    {"city": "Singapore", "lat": 1.3521, "lon": 103.8198, "country": "SG"},
    {"city": "Tokyo", "lat": 35.6762, "lon": 139.6503, "country": "JP"},
    {"city": "Frankfurt", "lat": 50.1109, "lon": 8.6821, "country": "DE"},
    {"city": "Sydney", "lat": -33.8688, "lon": 151.2093, "country": "AU"},
    {"city": "Sao Paulo", "lat": -23.5505, "lon": -46.6333, "country": "BR"}
]

def generate_synthetic_transactions(num_samples: int = 5000, anomaly_ratio: float = 0.08, seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    
    users = []
    for i in range(100):
        user_id = f"USR-{1000 + i}"
        base_amount = random.uniform(25.0, 180.0)
        home_city = random.choice(CITIES)
        primary_device = f"DEV-{random.randint(10000, 99999)}"
        users.append({
            "user_id": user_id,
            "base_amount": base_amount,
            "home_city": home_city,
            "primary_device": primary_device
        })
    
    records = []
    base_time = datetime.now(timezone.utc) - timedelta(days=14)
    
    for i in range(num_samples):
        user = random.choice(users)
        is_anomaly = random.random() < anomaly_ratio
        
        # Timestamp offset
        time_offset_seconds = random.uniform(0, 14 * 86400)
        txn_time = base_time + timedelta(seconds=time_offset_seconds)
        hour = txn_time.hour
        day_of_week = txn_time.weekday()
        
        if not is_anomaly:
            # Normal distribution around user baseline
            amount = max(2.0, np.random.normal(user["base_amount"], user["base_amount"] * 0.35))
            device_id = user["primary_device"] if random.random() < 0.95 else f"DEV-{random.randint(10000, 99999)}"
            city_info = user["home_city"] if random.random() < 0.92 else random.choice(CITIES)
            category = random.choice(MERCHANT_CATEGORIES)
            failed_attempts = 0 if random.random() < 0.96 else 1
            velocity_5m = random.randint(1, 2)
            velocity_1h = random.randint(1, 4)
            velocity_24h = random.randint(1, 10)
            is_new_device = 0 if device_id == user["primary_device"] else 1
            is_unusual_location = 0 if city_info["city"] == user["home_city"]["city"] else 1
            amount_deviation = amount / max(1.0, user["base_amount"])
            fraud_label = 0
        else:
            # Anomaly vectors: High amount, rapid bursts, foreign impossible travel, crypto spike
            anomaly_type = random.choice(["high_amount", "velocity_burst", "geo_hop", "device_takeover", "crypto_drain"])
            if anomaly_type == "high_amount":
                amount = user["base_amount"] * random.uniform(7.0, 35.0)
                device_id = user["primary_device"]
                city_info = user["home_city"]
                category = random.choice(["luxury_goods", "electronics", "online_retail"])
                failed_attempts = random.randint(0, 1)
                velocity_5m = random.randint(1, 3)
                velocity_1h = random.randint(2, 6)
                velocity_24h = random.randint(3, 12)
            elif anomaly_type == "velocity_burst":
                amount = np.random.normal(user["base_amount"] * 1.5, 40)
                device_id = user["primary_device"]
                city_info = user["home_city"]
                category = random.choice(MERCHANT_CATEGORIES)
                failed_attempts = random.randint(1, 4)
                velocity_5m = random.randint(6, 18)
                velocity_1h = random.randint(12, 35)
                velocity_24h = random.randint(20, 60)
            elif anomaly_type == "geo_hop":
                amount = np.random.normal(user["base_amount"] * 2.0, 50)
                device_id = f"DEV-{random.randint(10000, 99999)}"
                other_cities = [c for c in CITIES if c["city"] != user["home_city"]["city"]]
                city_info = random.choice(other_cities)
                category = random.choice(MERCHANT_CATEGORIES)
                failed_attempts = random.randint(1, 3)
                velocity_5m = random.randint(2, 5)
                velocity_1h = random.randint(4, 10)
                velocity_24h = random.randint(6, 15)
            elif anomaly_type == "crypto_drain":
                amount = user["base_amount"] * random.uniform(5.0, 20.0)
                device_id = f"DEV-{random.randint(10000, 99999)}"
                city_info = random.choice(CITIES)
                category = "crypto_exchange"
                failed_attempts = random.randint(2, 5)
                velocity_5m = random.randint(4, 10)
                velocity_1h = random.randint(8, 20)
                velocity_24h = random.randint(15, 40)
            else: # device_takeover
                amount = user["base_amount"] * random.uniform(3.0, 12.0)
                device_id = f"DEV-{random.randint(10000, 99999)}"
                city_info = random.choice(CITIES)
                category = random.choice(["luxury_goods", "crypto_exchange", "electronics"])
                failed_attempts = random.randint(3, 7)
                velocity_5m = random.randint(3, 8)
                velocity_1h = random.randint(5, 15)
                velocity_24h = random.randint(8, 25)
                
            is_new_device = 1 if device_id != user["primary_device"] else 0
            is_unusual_location = 1 if city_info["city"] != user["home_city"]["city"] else 0
            amount_deviation = amount / max(1.0, user["base_amount"])
            fraud_label = 1
            
        records.append({
            "transaction_id": f"TXN-{uuid.uuid4().hex[:10].upper()}",
            "user_id": user["user_id"],
            "amount": round(float(amount), 2),
            "user_baseline_amount": round(float(user["base_amount"]), 2),
            "amount_deviation": round(float(amount_deviation), 3),
            "hour_of_day": hour,
            "day_of_week": day_of_week,
            "velocity_5m": int(velocity_5m),
            "velocity_1h": int(velocity_1h),
            "velocity_24h": int(velocity_24h),
            "failed_attempts": int(failed_attempts),
            "is_new_device": int(is_new_device),
            "is_unusual_location": int(is_unusual_location),
            "is_high_risk_category": 1 if category in HIGH_RISK_CATEGORIES else 0,
            "category": category,
            "city": city_info["city"],
            "country": city_info["country"],
            "lat": city_info["lat"],
            "lon": city_info["lon"],
            "device_id": device_id,
            "timestamp": txn_time.isoformat(),
            "is_fraud": fraud_label
        })
        
    return pd.DataFrame(records)

if __name__ == "__main__":
    df = generate_synthetic_transactions(1000)
    print(f"Generated {len(df)} transactions. Anomaly count: {df['is_fraud'].sum()}")
