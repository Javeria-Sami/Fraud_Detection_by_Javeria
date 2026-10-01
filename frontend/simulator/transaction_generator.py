"""
Real-Time Transaction Simulator Generator.
Produces realistic synthetic financial transactions and configurable attack vectors for live demo & load testing.
Section 05 — Development Transaction Simulator.
"""
import uuid
import random
from datetime import datetime, timezone
from typing import Dict, Any, Optional

USERS = [
    {"user_id": "USR-CUST-1001", "name": "John Doe", "baseline": 85.0, "home_city": "London", "device": "DEV-MACBOOK-01"},
    {"user_id": "USR-CUST-1002", "name": "Sarah Connor", "baseline": 120.0, "home_city": "New York", "device": "DEV-WIN-01"},
    {"user_id": "USR-CUST-1003", "name": "Alice Smith", "baseline": 45.0, "home_city": "San Francisco", "device": "DEV-ANDROID-01"},
    {"user_id": "USR-CUST-1004", "name": "Elena Rostova", "baseline": 350.0, "home_city": "London", "device": "DEV-IPHONE-01"},
    {"user_id": "USR-CUST-1005", "name": "Marcus Vance", "baseline": 75.0, "home_city": "New York", "device": "DEV-WIN-01"},
    {"user_id": "USR-CUST-1006", "name": "Tariq Al-Mansoor", "baseline": 190.0, "home_city": "Singapore", "device": "DEV-MACBOOK-01"},
    {"user_id": "USR-CUST-1007", "name": "Aiko Tanaka", "baseline": 60.0, "home_city": "Tokyo", "device": "DEV-ANDROID-01"},
    {"user_id": "USR-CUST-1008", "name": "David Becker", "baseline": 110.0, "home_city": "Frankfurt", "device": "DEV-WIN-01"},
    {"user_id": "USR-CUST-1009", "name": "Chloe Dubois", "baseline": 95.0, "home_city": "London", "device": "DEV-IPHONE-01"},
    {"user_id": "USR-CUST-1010", "name": "Liam O'Connor", "baseline": 140.0, "home_city": "Sydney", "device": "DEV-MACBOOK-01"}
]

MERCHANTS = [
    {"merchant_id": "MERCH-AMAZON", "name": "Amazon Web Retail", "category": "Electronics & Retail", "risk_level": "low"},
    {"merchant_id": "MERCH-APPLE", "name": "Apple Store Online", "category": "Electronics & Devices", "risk_level": "low"},
    {"merchant_id": "MERCH-DELTA", "name": "Delta Air Lines", "category": "Travel & Airlines", "risk_level": "low"},
    {"merchant_id": "MERCH-BINANCE", "name": "Binance Global Exchange", "category": "Crypto & Exchange", "risk_level": "high"},
    {"merchant_id": "MERCH-GUCCI", "name": "Gucci Fifth Avenue", "category": "Luxury Goods", "risk_level": "medium"},
    {"merchant_id": "MERCH-STEAM", "name": "Steam Gaming Platform", "category": "Digital Goods", "risk_level": "low"},
    {"merchant_id": "MERCH-CASINO", "name": "Monte Carlo Royale", "category": "Gambling & Casino", "risk_level": "critical"}
]

CITIES_COORDS = {
    "London": {"lat": 51.5074, "lon": -0.1278, "country": "GB"},
    "New York": {"lat": 40.7128, "lon": -74.0060, "country": "US"},
    "San Francisco": {"lat": 37.7749, "lon": -122.4194, "country": "US"},
    "Singapore": {"lat": 1.3521, "lon": 103.8198, "country": "SG"},
    "Tokyo": {"lat": 35.6762, "lon": 139.6503, "country": "JP"},
    "Frankfurt": {"lat": 50.1109, "lon": 8.6821, "country": "DE"},
    "Sydney": {"lat": -33.8688, "lon": 151.2093, "country": "AU"},
    "Sao Paulo": {"lat": -23.5505, "lon": -46.6333, "country": "BR"},
    "Lagos": {"lat": 6.5244, "lon": 3.3792, "country": "NG"},
    "Kyiv": {"lat": 50.4501, "lon": 30.5234, "country": "UA"}
}

def generate_live_transaction(scenario: str = "mixed_risk", anomaly_probability: float = 0.15) -> Dict[str, Any]:
    """
    Generates a single synthetic transaction according to the requested scenario.
    Always marks source='SIMULATOR'.
    """
    user = random.choice(USERS)
    merchant = random.choice(MERCHANTS)
    
    # Determine if anomaly
    if scenario == "normal":
        is_anomaly = False
    elif scenario == "fraud_spike":
        is_anomaly = random.random() < 0.85
    elif scenario == "mixed_risk":
        is_anomaly = random.random() < anomaly_probability
    else:
        is_anomaly = True
        
    txn_id = f"TXN-SIM-{uuid.uuid4().hex[:8].upper()}"
    timestamp = datetime.now(timezone.utc).isoformat()
    payment_method = random.choice(["CREDIT_CARD", "DEBIT_CARD", "APPLE_PAY", "GOOGLE_PAY", "WIRE_TRANSFER"])
    ip_address = f"{random.randint(11, 210)}.{random.randint(1, 250)}.{random.randint(1, 250)}.{random.randint(1, 250)}"
    
    if not is_anomaly:
        amount = round(max(5.0, random.gauss(user["baseline"], user["baseline"] * 0.25)), 2)
        device_id = user["device"]
        city_name = user["home_city"]
        city_data = CITIES_COORDS.get(city_name, CITIES_COORDS["London"])
        failed_attempts = 0 if random.random() < 0.97 else 1
    else:
        attack_type = scenario if scenario in ["high_amount", "rapid_burst", "geo_hop", "new_device", "crypto_drain"] else random.choice([
            "high_amount", "rapid_burst", "geo_hop", "new_device", "crypto_drain"
        ])
        
        if attack_type == "high_amount":
            amount = round(user["baseline"] * random.uniform(8.0, 30.0), 2)
            device_id = user["device"]
            city_name = user["home_city"]
            city_data = CITIES_COORDS.get(city_name, CITIES_COORDS["New York"])
            failed_attempts = 0
            merchant = random.choice([m for m in MERCHANTS if m["risk_level"] in ["high", "critical"]] or MERCHANTS)
        elif attack_type == "rapid_burst":
            amount = round(user["baseline"] * random.uniform(1.2, 3.5), 2)
            device_id = user["device"]
            city_name = user["home_city"]
            city_data = CITIES_COORDS.get(city_name, CITIES_COORDS["London"])
            failed_attempts = random.randint(2, 5)
        elif attack_type == "geo_hop":
            amount = round(user["baseline"] * random.uniform(2.0, 6.0), 2)
            device_id = "DEV-BOT-01"
            foreign_cities = [c for c in CITIES_COORDS.keys() if c != user["home_city"]]
            city_name = random.choice(foreign_cities)
            city_data = CITIES_COORDS[city_name]
            failed_attempts = random.randint(1, 3)
        elif attack_type == "new_device":
            amount = round(user["baseline"] * random.uniform(3.0, 10.0), 2)
            device_id = "DEV-BOT-01"
            city_name = user["home_city"]
            city_data = CITIES_COORDS.get(city_name, CITIES_COORDS["London"])
            failed_attempts = random.randint(2, 6)
        else:  # crypto_drain
            amount = round(user["baseline"] * random.uniform(10.0, 45.0), 2)
            device_id = "DEV-BOT-01"
            city_name = "Lagos"
            city_data = CITIES_COORDS["Lagos"]
            merchant = {"merchant_id": "MERCH-BINANCE", "name": "Binance Global Exchange", "category": "Crypto & Exchange", "risk_level": "high"}
            failed_attempts = random.randint(3, 7)
            
    return {
        "transaction_id": txn_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "merchant_id": merchant.get("merchant_id"),
        "merchant_name": merchant["name"],
        "merchant_category": merchant["category"],
        "amount": amount,
        "currency": "USD",
        "payment_method": payment_method,
        "transaction_type": "PURCHASE",
        "device_id": device_id,
        "ip_address": ip_address,
        "city": city_name,
        "country": city_data["country"],
        "latitude": city_data["lat"],
        "longitude": city_data["lon"],
        "failed_attempts": failed_attempts,
        "timestamp": timestamp,
        "source": "SIMULATOR"
    }
