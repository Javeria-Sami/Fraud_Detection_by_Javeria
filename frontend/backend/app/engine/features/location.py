"""
Location & Geographic Distance Feature Calculators.
Section 06 — Feature Engineering.
Calculates great-circle Haversine distances, impossible geo-hop velocities, and location novelty.
"""
import math
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone

def haversine_distance_km(lat1: Optional[float], lon1: Optional[float], lat2: Optional[float], lon2: Optional[float]) -> float:
    """Calculates great-circle distance between two geographic coordinates in kilometers."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
        # Coordinate boundary checks
        if not (-90.0 <= lat1 <= 90.0 and -90.0 <= lat2 <= 90.0 and -180.0 <= lon1 <= 180.0 and -180.0 <= lon2 <= 180.0):
            return 0.0
        R = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
        return round(R * c, 3)
    except Exception:
        return 0.0

def calculate_location_features(
    country: Optional[str],
    city: Optional[str],
    latitude: Optional[float],
    longitude: Optional[float],
    current_time: datetime,
    known_countries: List[str],
    known_cities: List[str],
    last_tx_location: Optional[Tuple[Optional[float], Optional[float], Optional[datetime], Optional[str], Optional[str]]]
) -> Dict[str, Any]:
    """
    Computes location novelty, distance from previous transaction, and geo-hop travel speed.
    """
    cur_country = (country or "").strip().upper()
    cur_city = (city or "").strip()
    
    # 1. Novelty
    is_new_country = 1 if (known_countries and cur_country and cur_country not in known_countries) else 0
    is_new_city = 1 if (known_cities and cur_city and cur_city not in known_cities) else 0

    # 2. Distance from previous location
    dist_km = 0.0
    geo_hop_speed_kmh = 0.0
    seconds_since_prev = -1.0
    has_prev = 0

    if last_tx_location:
        prev_lat, prev_lon, prev_ts, prev_city, prev_country = last_tx_location
        has_prev = 1
        
        if prev_ts is not None:
            if prev_ts.tzinfo is None:
                prev_ts = prev_ts.replace(tzinfo=timezone.utc)
            if current_time.tzinfo is None:
                cur_ts = current_time.replace(tzinfo=timezone.utc)
            else:
                cur_ts = current_time

            time_diff = max(1.0, (cur_ts - prev_ts).total_seconds())
            seconds_since_prev = round(time_diff, 1)

            if latitude is not None and longitude is not None and prev_lat is not None and prev_lon is not None:
                dist_km = haversine_distance_km(prev_lat, prev_lon, latitude, longitude)
                hours_diff = time_diff / 3600.0
                geo_hop_speed_kmh = round(dist_km / max(0.001, hours_diff), 1)

    is_unusual_loc = 1 if (is_new_city or is_new_country or geo_hop_speed_kmh > 800.0) else 0

    return {
        "is_new_country": int(is_new_country),
        "is_new_city": int(is_new_city),
        "is_unusual_location": int(is_unusual_loc),
        "distance_from_previous_location_km": round(dist_km, 2),
        "geo_hop_speed_kmh": round(geo_hop_speed_kmh, 1),
        "seconds_since_previous_transaction": seconds_since_prev,
        "has_previous_location": int(has_prev)
    }
