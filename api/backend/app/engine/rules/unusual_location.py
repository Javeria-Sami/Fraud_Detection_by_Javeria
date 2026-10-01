"""
Rule 4 — Unusual Location & Impossible Travel Velocity (UNUSUAL_LOCATION).
Section 07 — Rule-Based Fraud Engine.
"""
from typing import Dict, Any
from backend.app.engine.rules.base import BaseRule
from backend.app.engine.rules.types import (
    RuleEvaluationResult,
    RuleSeverity,
    RuleCategory,
    RuleEvidence
)


class UnusualLocationRule(BaseRule):
    """
    Detects geographical anomalies such as novel countries/cities and physical impossibility
    of travel (speed exceeding configured threshold, e.g. 700 km/h).
    """
    code = "UNUSUAL_LOCATION"
    name = "Unusual Location / Impossible Travel"
    description = "Flags geographical hops exceeding maximum physical travel velocity or unfamiliar regions."
    category = RuleCategory.LOCATION
    default_severity = RuleSeverity.HIGH
    default_weight = 30.0

    def evaluate(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        configuration: Dict[str, Any],
        version: str
    ) -> RuleEvaluationResult:
        max_geo_speed = float(configuration.get("max_geo_speed_kmh", configuration.get("speed_threshold", 700.0)))
        new_country_enabled = bool(configuration.get("new_country_enabled", True))
        new_city_enabled = bool(configuration.get("new_city_enabled", False))

        is_unusual_loc = int(features.get("is_unusual_location", 0))
        is_new_country = int(features.get("is_new_country", 0))
        is_new_city = int(features.get("is_new_city", 0))
        geo_hop_speed = float(features.get("geo_hop_speed_kmh", 0.0))
        distance_km = float(features.get("distance_from_previous_location_km", 0.0))
        city = transaction.get("city") or "Unknown"
        country = transaction.get("country") or "Unknown"

        triggered = False
        reason = ""
        evidence = None

        if geo_hop_speed > max_geo_speed:
            triggered = True
            reason = (
                f"Impossible travel speed detected: geographical displacement of {distance_km:.1f} km "
                f"at {geo_hop_speed:.0f} km/h exceeds maximum physical threshold of {max_geo_speed:.0f} km/h."
            )
            evidence = RuleEvidence(
                feature="geo_hop_speed_kmh",
                actual_value=round(geo_hop_speed, 1),
                threshold=max_geo_speed,
                comparison="greater_than",
                metadata={"distance_km": round(distance_km, 1), "city": city, "country": country}
            )
        elif new_country_enabled and is_new_country == 1:
            triggered = True
            reason = f"Transaction originated from country '{country}' never previously seen for this customer."
            evidence = RuleEvidence(
                feature="is_new_country",
                actual_value=1,
                threshold=1,
                comparison="equal",
                metadata={"country": country, "city": city}
            )
        elif new_city_enabled and is_new_city == 1:
            triggered = True
            reason = f"Transaction originated from new city '{city}' for this customer."
            evidence = RuleEvidence(
                feature="is_new_city",
                actual_value=1,
                threshold=1,
                comparison="equal",
                metadata={"city": city}
            )
        elif is_unusual_loc == 1:
            triggered = True
            reason = f"Transaction initiated from unfamiliar geographical location ({city}, {country})."
            evidence = RuleEvidence(
                feature="is_unusual_location",
                actual_value=1,
                threshold=1,
                comparison="equal",
                metadata={"city": city, "country": country}
            )

        return RuleEvaluationResult(
            rule_code=self.code,
            triggered=triggered,
            reason=reason if triggered else "Location and travel velocity are consistent with historical customer profile.",
            evidence=evidence,
            matched_features={
                "geo_hop_speed_kmh": geo_hop_speed,
                "is_unusual_location": is_unusual_loc,
                "is_new_country": is_new_country,
                "is_new_city": is_new_city,
                "distance_km": distance_km
            }
        )
