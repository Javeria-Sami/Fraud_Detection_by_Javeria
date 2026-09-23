# Fraud Rule Dictionary

Comprehensive catalog of all deterministic rules registered in the Fraud Rule Engine.

---

## 1. `HIGH_AMOUNT` — High Transaction Amount
- **Category**: `AMOUNT`
- **Default Severity**: `HIGH`
- **Default Weight**: `25.0`
- **Purpose**: Flags transactions where the amount significantly exceeds the customer's historical baseline or exceeds an absolute threshold.
- **Features Used**: `amount`, `amount_deviation`, `user_baseline_amount`
- **Configuration Schema**:
  ```json
  {
    "multiplier": 5.0,
    "min_amount": 500.0,
    "mode": "user_deviation"
  }
  ```
- **Trigger Condition**: `(amount_deviation >= multiplier AND amount >= min_amount)` OR `(mode == "absolute_threshold" AND amount >= threshold)`
- **Explainability**: *"Transaction amount $2,500.00 is 6.0x the customer historical baseline ($400.00), exceeding 5.0x threshold (minimum $500.00)."*

---

## 2. `RAPID_TRANSACTIONS` — Rapid Velocity Sequence
- **Category**: `VELOCITY`
- **Default Severity**: `HIGH`
- **Default Weight**: `25.0`
- **Purpose**: Detects rapid bursts of transactions within short rolling windows (1m, 5m, 10m).
- **Features Used**: `velocity_1m`, `velocity_5m`, `velocity_10m`, `velocity_1h`
- **Configuration Schema**:
  ```json
  {
    "window_minutes": 5,
    "count_threshold": 4
  }
  ```
- **Trigger Condition**: `velocity_{window_minutes}m >= count_threshold`
- **Explainability**: *"High velocity burst detected: 5 transactions in the last 5 minutes (threshold: 4)."*

---

## 3. `NEW_DEVICE` — Unseen Novel Device
- **Category**: `DEVICE`
- **Default Severity**: `MEDIUM`
- **Default Weight**: `20.0`
- **Purpose**: Flags transactions originating from a device fingerprint never before used by the user.
- **Features Used**: `is_new_device`, `device_transaction_count`
- **Configuration Schema**:
  ```json
  {
    "enabled": true
  }
  ```
- **Trigger Condition**: `is_new_device == 1 AND enabled == true`
- **Explainability**: *"Transaction originated from a device 'DEV-NOVEL-999' not previously associated with this user's transaction history."*

---

## 4. `UNUSUAL_LOCATION` — Unusual Location / Impossible Travel
- **Category**: `LOCATION`
- **Default Severity**: `HIGH`
- **Default Weight**: `30.0`
- **Purpose**: Detects geographical anomalies such as novel countries/cities or physically impossible travel velocities (> 700 km/h).
- **Features Used**: `geo_hop_speed_kmh`, `is_unusual_location`, `is_new_country`, `is_new_city`, `distance_from_previous_location_km`
- **Configuration Schema**:
  ```json
  {
    "max_geo_speed_kmh": 700.0,
    "new_country_enabled": true,
    "new_city_enabled": false
  }
  ```
- **Trigger Condition**: `geo_hop_speed_kmh > max_geo_speed_kmh OR is_new_country == 1 OR is_unusual_location == 1`
- **Explainability**: *"Impossible travel speed detected: geographical displacement of 1900.0 km at 950 km/h exceeds maximum physical threshold of 700 km/h."*

---

## 5. `UNUSUAL_TIME` — Unusual Transaction Time
- **Category**: `TIME`
- **Default Severity**: `LOW`
- **Default Weight**: `15.0`
- **Purpose**: Flags high-value activity during overnight hours (01:00-05:00 UTC) or activity outside the user's historical active hours.
- **Features Used**: `hour_of_day`, `is_unusual_transaction_hour`, `amount_deviation`
- **Configuration Schema**:
  ```json
  {
    "night_start": 1,
    "night_end": 5,
    "min_deviation_threshold": 2.0
  }
  ```
- **Trigger Condition**: `(night_start <= hour <= night_end AND amount_deviation >= min_deviation_threshold) OR (is_unusual_transaction_hour == 1 AND amount_deviation >= 1.5)`
- **Explainability**: *"Elevated transaction initiated during off-hours window (03:00 UTC) with 3.5x customer baseline spend."*

---

## 6. `FAILED_ATTEMPTS` — Authentication Attempt Spike
- **Category**: `FAILED_ATTEMPTS`
- **Default Severity**: `HIGH`
- **Default Weight**: `25.0`
- **Purpose**: Flags repeated failed authentication, PIN, or CVV validation attempts preceding the transaction.
- **Features Used**: `failed_attempts`, `failed_transactions_last_10m`, `failed_transactions_last_1h`
- **Configuration Schema**:
  ```json
  {
    "max_failed_attempts": 2
  }
  ```
- **Trigger Condition**: `failed_attempts >= max_failed_attempts`
- **Explainability**: *"3 failed authentication/CVV attempts preceding this transaction (threshold: 2)."*

---

## 7. `SUDDEN_SPENDING_INCREASE` — Sudden Spending Surge
- **Category**: `BEHAVIOR`
- **Default Severity**: `MEDIUM`
- **Default Weight**: `20.0`
- **Purpose**: Flags sharp surges in hourly spending velocity or cumulative 1-hour volume.
- **Features Used**: `velocity_1h`, `volume_1h`, `amount_deviation`
- **Configuration Schema**:
  ```json
  {
    "max_txns_1h": 10,
    "spending_multiplier": 3.0
  }
  ```
- **Trigger Condition**: `velocity_1h >= max_txns_1h OR (amount_deviation >= spending_multiplier AND velocity_1h >= 2)`
- **Explainability**: *"12 transactions in the last hour exceeding maximum hourly threshold of 10."*

---

## 8. `MERCHANT_ANOMALY` — High-Risk Merchant Category Deviation
- **Category**: `MERCHANT`
- **Default Severity**: `HIGH`
- **Default Weight**: `25.0`
- **Purpose**: Elevates risk for cryptocurrency, casino, and high-risk merchant categories when combined with spending deviation or first-time usage.
- **Features Used**: `merchant_category`, `is_high_risk_category`, `is_new_merchant_for_user`, `amount_deviation`
- **Configuration Schema**:
  ```json
  {
    "high_risk_categories": ["Crypto & Exchange", "Gambling & Casino", "crypto_exchange", "luxury_goods"],
    "min_amount_deviation": 2.0
  }
  ```
- **Trigger Condition**: `is_high_risk_category AND (amount_deviation >= min_amount_deviation OR is_new_merchant_for_user == 1)`
- **Explainability**: *"High-risk merchant category 'Crypto & Exchange' with elevated spending (3.0x baseline deviation vs 2.0x threshold)."*

---

## 9. `BEHAVIOR_DEVIATION` — Compound Behavioral Deviation
- **Category**: `BEHAVIOR`
- **Default Severity**: `CRITICAL`
- **Default Weight**: `35.0`
- **Purpose**: Detects compound anomalies across simultaneous novel device, location leap, and elevated amount preceded by failed attempts.
- **Features Used**: `is_new_device`, `is_unusual_location`, `amount_deviation`, `failed_attempts`
- **Configuration Schema**:
  ```json
  {
    "min_deviation_threshold": 4.0
  }
  ```
- **Trigger Condition**: `(is_new_device == 1 AND (is_unusual_location == 1 OR is_new_country == 1)) OR (amount_deviation >= min_deviation_threshold AND failed_attempts > 0)`
- **Explainability**: *"Compound behavioral anomaly: simultaneous novel device and unfamiliar geographical location."*
