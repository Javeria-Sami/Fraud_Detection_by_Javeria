"""
Device Behavioral Feature Calculators.
Section 06 — Feature Engineering.
Calculates device novelty for user, device global frequency, and device failure metrics.
"""
from typing import Dict, Any, List, Set, Optional

def calculate_device_features(
    device_id: str,
    known_devices_for_user: List[str],
    global_device_tx_count: int,
    global_device_user_count: int,
    global_device_failed_count: int,
    seconds_since_first_seen: float
) -> Dict[str, Any]:
    """
    Computes device novelty and behavioral metrics.
    """
    clean_device_id = (device_id or "").strip()
    
    # Check novelty for user
    if known_devices_for_user:
        is_new_device = 1 if clean_device_id not in known_devices_for_user else 0
    else:
        # If user has no known devices in profile yet, check for suspicious test/rogue/unknown prefixes
        is_new_device = 1 if any(p in clean_device_id.upper() for p in ["UNKNOWN", "ROGUE", "TOR", "TEST", "BOT"]) else 0

    return {
        "is_new_device": int(is_new_device),
        "device_transaction_count": int(global_device_tx_count or 0),
        "device_user_count": int(global_device_user_count or 1),
        "device_failed_transaction_count": int(global_device_failed_count or 0),
        "seconds_since_device_first_seen": max(0.0, round(float(seconds_since_first_seen or 0.0), 1))
    }
