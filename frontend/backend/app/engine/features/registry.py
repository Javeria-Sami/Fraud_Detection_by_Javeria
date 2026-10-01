"""
Centralized Feature Definition Registry.
Section 06 — Feature Engineering.
Maintains canonical definitions, metadata, versions, and descriptions for all platform features.
"""
from typing import Dict, List, Optional
from backend.app.engine.features.types import FeatureDefinition, FeatureCategory, FeatureDataType

FEATURE_VERSION = "v1.0.0"

FEATURE_DEFINITIONS: List[FeatureDefinition] = [
    # 1. Amount Features
    FeatureDefinition(
        name="amount",
        category=FeatureCategory.AMOUNT,
        data_type=FeatureDataType.NUMERIC,
        description="Transaction monetary amount",
        calculation="Raw transaction payload amount",
        expected_range="> 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="transaction_amount",
        category=FeatureCategory.AMOUNT,
        data_type=FeatureDataType.NUMERIC,
        description="Explicit transaction monetary amount alias",
        calculation="Raw transaction payload amount",
        expected_range="> 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="user_baseline_amount",
        category=FeatureCategory.AMOUNT,
        data_type=FeatureDataType.NUMERIC,
        description="User historical average spending baseline",
        calculation="Historical average of completed user transactions or UserRiskProfile baseline",
        expected_range=">= 0.0",
        default_value=100.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="user_average_transaction_amount",
        category=FeatureCategory.AMOUNT,
        data_type=FeatureDataType.NUMERIC,
        description="Exact historical average of user past transactions",
        calculation="SUM(past_amounts) / COUNT(past_amounts)",
        expected_range=">= 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="amount_deviation",
        category=FeatureCategory.AMOUNT,
        data_type=FeatureDataType.NUMERIC,
        description="Ratio of transaction amount to user historical baseline",
        calculation="amount / max(1.0, user_baseline_amount)",
        expected_range=">= 0.0",
        default_value=1.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="amount_deviation_from_user_average",
        category=FeatureCategory.AMOUNT,
        data_type=FeatureDataType.NUMERIC,
        description="Normalized relative deviation from user historical average",
        calculation="(amount - user_average_transaction_amount) / max(1.0, user_average_transaction_amount)",
        expected_range=">= -1.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="amount_ratio_to_user_average",
        category=FeatureCategory.AMOUNT,
        data_type=FeatureDataType.NUMERIC,
        description="Direct ratio of current amount to past user average",
        calculation="amount / max(1.0, user_average_transaction_amount)",
        expected_range=">= 0.0",
        default_value=1.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="user_max_transaction_amount",
        category=FeatureCategory.AMOUNT,
        data_type=FeatureDataType.NUMERIC,
        description="Maximum transaction amount previously spent by this user",
        calculation="MAX(past_amounts)",
        expected_range=">= 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),

    # 2. Historical Context & Cold-Start
    FeatureDefinition(
        name="user_transaction_count",
        category=FeatureCategory.HISTORICAL,
        data_type=FeatureDataType.INTEGER,
        description="Total count of prior transactions by this user",
        calculation="COUNT(transactions where user_id == user_id and timestamp < current_t)",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="user_total_spend",
        category=FeatureCategory.HISTORICAL,
        data_type=FeatureDataType.NUMERIC,
        description="Cumulative financial spend of user prior to current transaction",
        calculation="SUM(past_amounts where user_id == user_id and timestamp < current_t)",
        expected_range=">= 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="has_sufficient_history",
        category=FeatureCategory.HISTORICAL,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating if user has at least 3 historical transactions",
        calculation="user_transaction_count >= 3",
        expected_range="0 or 1",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="is_first_user_transaction",
        category=FeatureCategory.HISTORICAL,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating if this is the user's very first recorded transaction",
        calculation="user_transaction_count == 0",
        expected_range="0 or 1",
        default_value=1,
        version=FEATURE_VERSION
    ),

    # 3. Sliding-Window Velocity & Volume Features
    FeatureDefinition(
        name="velocity_1m",
        category=FeatureCategory.VELOCITY,
        data_type=FeatureDataType.INTEGER,
        description="Number of transactions in the last 1 minute before current transaction",
        calculation="COUNT(timestamp in [T - 1m, T))",
        time_window="1 minute",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="velocity_5m",
        category=FeatureCategory.VELOCITY,
        data_type=FeatureDataType.INTEGER,
        description="Number of transactions in the last 5 minutes before current transaction",
        calculation="COUNT(timestamp in [T - 5m, T))",
        time_window="5 minutes",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="velocity_10m",
        category=FeatureCategory.VELOCITY,
        data_type=FeatureDataType.INTEGER,
        description="Number of transactions in the last 10 minutes before current transaction",
        calculation="COUNT(timestamp in [T - 10m, T))",
        time_window="10 minutes",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="velocity_1h",
        category=FeatureCategory.VELOCITY,
        data_type=FeatureDataType.INTEGER,
        description="Number of transactions in the last 1 hour before current transaction",
        calculation="COUNT(timestamp in [T - 1h, T))",
        time_window="1 hour",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="velocity_24h",
        category=FeatureCategory.VELOCITY,
        data_type=FeatureDataType.INTEGER,
        description="Number of transactions in the last 24 hours before current transaction",
        calculation="COUNT(timestamp in [T - 24h, T))",
        time_window="24 hours",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="volume_5m",
        category=FeatureCategory.VELOCITY,
        data_type=FeatureDataType.NUMERIC,
        description="Cumulative financial volume in the last 5 minutes",
        calculation="SUM(amount where timestamp in [T - 5m, T))",
        time_window="5 minutes",
        expected_range=">= 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="volume_10m",
        category=FeatureCategory.VELOCITY,
        data_type=FeatureDataType.NUMERIC,
        description="Cumulative financial volume in the last 10 minutes",
        calculation="SUM(amount where timestamp in [T - 10m, T))",
        time_window="10 minutes",
        expected_range=">= 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="volume_1h",
        category=FeatureCategory.VELOCITY,
        data_type=FeatureDataType.NUMERIC,
        description="Cumulative financial volume in the last 1 hour",
        calculation="SUM(amount where timestamp in [T - 1h, T))",
        time_window="1 hour",
        expected_range=">= 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="volume_24h",
        category=FeatureCategory.VELOCITY,
        data_type=FeatureDataType.NUMERIC,
        description="Cumulative financial volume in the last 24 hours",
        calculation="SUM(amount where timestamp in [T - 24h, T))",
        time_window="24 hours",
        expected_range=">= 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="seconds_since_previous_transaction",
        category=FeatureCategory.VELOCITY,
        data_type=FeatureDataType.NUMERIC,
        description="Elapsed time in seconds since user's most recent prior transaction",
        calculation="(current_timestamp - last_transaction_timestamp).total_seconds()",
        expected_range=">= 0.0",
        default_value=-1.0,  # -1 indicates no prior transaction
        version=FEATURE_VERSION
    ),

    # 4. Device Features
    FeatureDefinition(
        name="is_new_device",
        category=FeatureCategory.DEVICE,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating if the device has never been used by this user before",
        calculation="device_id not in user_known_devices",
        expected_range="0 or 1",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="device_transaction_count",
        category=FeatureCategory.DEVICE,
        data_type=FeatureDataType.INTEGER,
        description="Total global transactions recorded on this device ID",
        calculation="COUNT(transactions where device_id == device_id and timestamp < current_t)",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="device_user_count",
        category=FeatureCategory.DEVICE,
        data_type=FeatureDataType.INTEGER,
        description="Count of distinct users that have used this device",
        calculation="COUNT(DISTINCT user_id where device_id == device_id)",
        expected_range=">= 0",
        default_value=1,
        version=FEATURE_VERSION
    ),

    # 5. Location Features
    FeatureDefinition(
        name="is_new_country",
        category=FeatureCategory.LOCATION,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating if this country has not been seen in user history",
        calculation="country not in user_known_countries",
        expected_range="0 or 1",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="is_new_city",
        category=FeatureCategory.LOCATION,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating if this city has not been seen in user history",
        calculation="city not in user_known_cities",
        expected_range="0 or 1",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="is_unusual_location",
        category=FeatureCategory.LOCATION,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating location novelty or impossible transit speed",
        calculation="is_new_city or geo_hop_speed_kmh > 800.0",
        expected_range="0 or 1",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="distance_from_previous_location_km",
        category=FeatureCategory.LOCATION,
        data_type=FeatureDataType.NUMERIC,
        description="Great-circle distance in km from user's previous transaction coordinates",
        calculation="Haversine(prev_lat, prev_lon, cur_lat, cur_lon)",
        expected_range=">= 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="geo_hop_speed_kmh",
        category=FeatureCategory.LOCATION,
        data_type=FeatureDataType.NUMERIC,
        description="Calculated travel speed in km/h between consecutive transactions",
        calculation="distance_from_previous_location_km / max(0.001, hours_elapsed)",
        expected_range=">= 0.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),

    # 6. Temporal Features
    FeatureDefinition(
        name="hour_of_day",
        category=FeatureCategory.TIME,
        data_type=FeatureDataType.INTEGER,
        description="Hour of transaction in UTC (0-23)",
        calculation="timestamp.hour",
        expected_range="0 to 23",
        default_value=12,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="day_of_week",
        category=FeatureCategory.TIME,
        data_type=FeatureDataType.INTEGER,
        description="Day of week (0=Monday, 6=Sunday)",
        calculation="timestamp.weekday()",
        expected_range="0 to 6",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="day_of_month",
        category=FeatureCategory.TIME,
        data_type=FeatureDataType.INTEGER,
        description="Day of month (1-31)",
        calculation="timestamp.day",
        expected_range="1 to 31",
        default_value=1,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="month",
        category=FeatureCategory.TIME,
        data_type=FeatureDataType.INTEGER,
        description="Month of year (1-12)",
        calculation="timestamp.month",
        expected_range="1 to 12",
        default_value=1,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="is_weekend",
        category=FeatureCategory.TIME,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating if transaction occurs on Saturday or Sunday",
        calculation="day_of_week in [5, 6]",
        expected_range="0 or 1",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="is_night",
        category=FeatureCategory.TIME,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating transaction occurred during night hours (23:00 to 05:00 UTC)",
        calculation="hour_of_day >= 23 or hour_of_day < 5",
        expected_range="0 or 1",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="hour_sin",
        category=FeatureCategory.TIME,
        data_type=FeatureDataType.NUMERIC,
        description="Sine cyclical projection of hour of day",
        calculation="sin(2 * pi * hour / 24.0)",
        expected_range="-1.0 to 1.0",
        default_value=0.0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="hour_cos",
        category=FeatureCategory.TIME,
        data_type=FeatureDataType.NUMERIC,
        description="Cosine cyclical projection of hour of day",
        calculation="cos(2 * pi * hour / 24.0)",
        expected_range="-1.0 to 1.0",
        default_value=1.0,
        version=FEATURE_VERSION
    ),

    # 7. Merchant Features
    FeatureDefinition(
        name="is_high_risk_category",
        category=FeatureCategory.MERCHANT,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating merchant category is high-risk (crypto, luxury, casino, etc.)",
        calculation="category in ['crypto_exchange', 'luxury_goods', 'casino', 'gambling']",
        expected_range="0 or 1",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="merchant_transaction_count",
        category=FeatureCategory.MERCHANT,
        data_type=FeatureDataType.INTEGER,
        description="Global count of transactions at this merchant",
        calculation="COUNT(transactions where merchant_name == merchant_name)",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="user_merchant_transaction_count",
        category=FeatureCategory.MERCHANT,
        data_type=FeatureDataType.INTEGER,
        description="Prior transaction count between this specific user and merchant",
        calculation="COUNT(transactions where user_id == user_id and merchant_name == merchant_name)",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="is_new_merchant_for_user",
        category=FeatureCategory.MERCHANT,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating user has never shopped at this merchant before",
        calculation="user_merchant_transaction_count == 0",
        expected_range="0 or 1",
        default_value=1,
        version=FEATURE_VERSION
    ),

    # 8. Failed Attempt Features
    FeatureDefinition(
        name="failed_attempts",
        category=FeatureCategory.FAILED_ATTEMPTS,
        data_type=FeatureDataType.INTEGER,
        description="Failed auth/PIN attempts recorded on current transaction",
        calculation="Raw transaction payload failed_attempts",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="failed_transactions_last_1h",
        category=FeatureCategory.FAILED_ATTEMPTS,
        data_type=FeatureDataType.INTEGER,
        description="Number of failed transactions by user in the last 1 hour",
        calculation="COUNT(failed transactions where timestamp in [T - 1h, T))",
        time_window="1 hour",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="failed_transactions_last_24h",
        category=FeatureCategory.FAILED_ATTEMPTS,
        data_type=FeatureDataType.INTEGER,
        description="Number of failed transactions by user in the last 24 hours",
        calculation="COUNT(failed transactions where timestamp in [T - 24h, T))",
        time_window="24 hours",
        expected_range=">= 0",
        default_value=0,
        version=FEATURE_VERSION
    ),

    # 9. Payment Instrument Features
    FeatureDefinition(
        name="is_new_payment_method",
        category=FeatureCategory.PAYMENT,
        data_type=FeatureDataType.BOOLEAN,
        description="Flag indicating payment method has not been used by user before",
        calculation="payment_method not in user_known_payment_methods",
        expected_range="0 or 1",
        default_value=0,
        version=FEATURE_VERSION
    ),
    FeatureDefinition(
        name="user_payment_method_count",
        category=FeatureCategory.PAYMENT,
        data_type=FeatureDataType.INTEGER,
        description="Distinct count of payment methods used by user",
        calculation="COUNT(DISTINCT payment_method where user_id == user_id)",
        expected_range=">= 0",
        default_value=1,
        version=FEATURE_VERSION
    )
]

FEATURE_REGISTRY: Dict[str, FeatureDefinition] = {f.name: f for f in FEATURE_DEFINITIONS}

def get_feature_definition(name: str) -> Optional[FeatureDefinition]:
    return FEATURE_REGISTRY.get(name)

def list_features_by_category(category: FeatureCategory) -> List[FeatureDefinition]:
    return [f for f in FEATURE_DEFINITIONS if f.category == category]

def get_all_feature_definitions() -> List[FeatureDefinition]:
    return list(FEATURE_DEFINITIONS)
