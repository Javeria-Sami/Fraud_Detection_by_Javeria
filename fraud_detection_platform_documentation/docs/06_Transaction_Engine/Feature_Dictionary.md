# Platform Feature Dictionary (`v1.0.0`)

| Feature Name | Category | Type | Calculation Formula | Time Window | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `amount` | Amount | Numeric | Raw transaction amount | Current | 0.0 | Transaction monetary amount |
| `user_baseline_amount` | Amount | Numeric | Profile baseline or historical average | All history | 100.0 | User average baseline spend |
| `user_average_transaction_amount` | Amount | Numeric | `SUM(past_amt) / COUNT(past_amt)` | All history | Baseline | Exact historical average |
| `user_median_transaction_amount` | Amount | Numeric | Median of past amounts | All history | Baseline | User median transaction amount |
| `amount_deviation` | Amount | Numeric | `amount / max(1.0, user_baseline)` | Current vs Profile | 1.0 | Baseline deviation ratio |
| `amount_deviation_from_user_average` | Amount | Numeric | `(amount - avg) / max(1.0, avg)` | Current vs Avg | 0.0 | Normalized deviation from avg |
| `amount_ratio_to_user_average` | Amount | Numeric | `amount / max(1.0, avg)` | Current vs Avg | 1.0 | Ratio to user historical avg |
| `user_max_transaction_amount` | Amount | Numeric | `MAX(past_amounts)` | All history | `amount` | Peak transaction amount |
| `user_transaction_count` | Historical | Integer | `COUNT(prior_transactions)` | All history | 0 | Total prior transactions |
| `user_total_spend` | Historical | Numeric | `SUM(prior_amounts)` | All history | 0.0 | Cumulative historical spend |
| `has_sufficient_history` | Historical | Boolean | `user_transaction_count >= 3` | All history | 0 | User history sufficiency flag |
| `is_first_user_transaction` | Historical | Boolean | `user_transaction_count == 0` | All history | 1 | First transaction flag |
| `velocity_1m` | Velocity | Integer | `COUNT(prior_txns in [T-1m, T))` | 1 min | 0 | Transaction count in last 1m |
| `velocity_5m` | Velocity | Integer | `COUNT(prior_txns in [T-5m, T))` | 5 min | 0 | Transaction count in last 5m |
| `velocity_10m` | Velocity | Integer | `COUNT(prior_txns in [T-10m, T))` | 10 min | 0 | Transaction count in last 10m |
| `velocity_1h` | Velocity | Integer | `COUNT(prior_txns in [T-1h, T))` | 1 hour | 0 | Transaction count in last 1h |
| `velocity_24h` | Velocity | Integer | `COUNT(prior_txns in [T-24h, T))` | 24 hours | 0 | Transaction count in last 24h |
| `volume_1m` | Velocity | Numeric | `SUM(prior_amt in [T-1m, T))` | 1 min | 0.0 | Volume in last 1m |
| `volume_5m` | Velocity | Numeric | `SUM(prior_amt in [T-5m, T))` | 5 min | 0.0 | Volume in last 5m |
| `volume_10m` | Velocity | Numeric | `SUM(prior_amt in [T-10m, T))` | 10 min | 0.0 | Volume in last 10m |
| `volume_1h` | Velocity | Numeric | `SUM(prior_amt in [T-1h, T))` | 1 hour | 0.0 | Volume in last 1h |
| `volume_24h` | Velocity | Numeric | `SUM(prior_amt in [T-24h, T))` | 24 hours | 0.0 | Volume in last 24h |
| `average_transaction_interval_seconds` | Velocity | Numeric | Mean of intervals between prior txns | 24 hours | 0.0 | Average seconds between txns |
| `is_new_device` | Device | Boolean | `device_id not in user_known_devices` | All history | 0 | Novel device flag for user |
| `device_transaction_count` | Device | Integer | `COUNT(txns with device_id)` | All history | 0 | Global transactions on device |
| `device_user_count` | Device | Integer | `COUNT(DISTINCT user_id on device)` | All history | 1 | Distinct users on device |
| `is_new_country` | Location | Boolean | `country not in user_known_countries` | All history | 0 | Novel country flag |
| `is_new_city` | Location | Boolean | `city not in user_known_cities` | All history | 0 | Novel city flag |
| `distance_from_previous_location_km` | Location | Numeric | Haversine(prev_coords, cur_coords) | Prior txn | 0.0 | Great-circle distance in km |
| `geo_hop_speed_kmh` | Location | Numeric | `distance_km / max(0.001, hours)` | Prior txn | 0.0 | Transit speed between txns |
| `is_unusual_location` | Location | Boolean | `is_new_city or geo_hop_speed > 800` | Prior txn | 0 | Location anomaly flag |
| `seconds_since_previous_transaction` | Location | Duration | `(current_t - prev_t).total_seconds()` | Prior txn | -1.0 | Seconds since last transaction |
| `hour_of_day` | Time | Integer | `timestamp.hour` | Current | 12 | Hour of day (0–23 UTC) |
| `day_of_week` | Time | Integer | `timestamp.weekday()` | Current | 0 | Day of week (0=Mon, 6=Sun) |
| `is_weekend` | Time | Boolean | `day_of_week in [5, 6]` | Current | 0 | Weekend flag |
| `is_night` | Time | Boolean | `hour >= 23 or hour < 5` | Current | 0 | Night hours flag (UTC) |
| `hour_sin` | Time | Numeric | `sin(2 * pi * hour / 24.0)` | Current | 0.0 | Cyclical sine projection |
| `hour_cos` | Time | Numeric | `cos(2 * pi * hour / 24.0)` | Current | 1.0 | Cyclical cosine projection |
| `is_unusual_transaction_hour` | Time | Boolean | Frequency in user history < 5% | All history | 0 | Behavioral time anomaly |
| `is_high_risk_category` | Merchant | Boolean | `category in [crypto, luxury, casino]` | Current | 0 | High-risk merchant flag |
| `merchant_transaction_count` | Merchant | Integer | `COUNT(txns at merchant)` | All history | 0 | Global merchant transactions |
| `user_merchant_transaction_count` | Merchant | Integer | `COUNT(txns by user at merchant)` | All history | 0 | User familiarity count |
| `is_new_merchant_for_user` | Merchant | Boolean | `user_merchant_count == 0` | All history | 1 | New merchant for user flag |
| `failed_attempts` | Failed | Integer | Payload `failed_attempts` | Current | 0 | Current failed auth tries |
| `failed_transactions_last_10m` | Failed | Integer | `COUNT(failures in [T-10m, T))` | 10 min | 0 | Recent failures in 10m |
| `failed_transactions_last_1h` | Failed | Integer | `COUNT(failures in [T-1h, T))` | 1 hour | 0 | Recent failures in 1h |
| `failed_transactions_last_24h` | Failed | Integer | `COUNT(failures in [T-24h, T))` | 24 hours | 0 | Recent failures in 24h |
| `is_new_payment_method` | Payment | Boolean | `method not in user_known_methods` | All history | 0 | Novel payment instrument |
