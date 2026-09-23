# ML Feature Dictionary

The ML Anomaly Detection model uses 26 aligned, versioned features (`FEATURE_VERSION = "v1.0.0"`).

| Feature Name | Type | Extraction Source | Description | Imputation Default |
| :--- | :--- | :--- | :--- | :--- |
| `amount` | Float | Transaction | Raw financial transaction amount in USD | `0.0` |
| `amount_deviation` | Float | Historical Profile | Ratio of transaction amount to customer historical average | `1.0` |
| `velocity_1m` | Integer | Rolling Window | Number of transactions by user in the last 1 minute | `1.0` |
| `velocity_5m` | Integer | Rolling Window | Number of transactions by user in the last 5 minutes | `1.0` |
| `velocity_10m` | Integer | Rolling Window | Number of transactions by user in the last 10 minutes | `1.0` |
| `velocity_1h` | Integer | Rolling Window | Number of transactions by user in the last 1 hour | `1.0` |
| `velocity_24h` | Integer | Rolling Window | Number of transactions by user in the last 24 hours | `1.0` |
| `volume_5m` | Float | Rolling Window | Cumulative spending amount by user in the last 5 minutes | `0.0` |
| `volume_1h` | Float | Rolling Window | Cumulative spending amount by user in the last 1 hour | `0.0` |
| `volume_24h` | Float | Rolling Window | Cumulative spending amount by user in the last 24 hours | `0.0` |
| `failed_attempts` | Integer | Transaction | Failed PIN/CVV authorization attempts preceding transaction | `0.0` |
| `is_new_device` | Binary (0/1) | Device Profile | `1` if device fingerprint has never been seen for customer | `0.0` |
| `device_transaction_count`| Integer | Device Profile | Historical count of transactions on this device fingerprint | `1.0` |
| `is_new_country` | Binary (0/1) | Location Profile| `1` if country has never been seen for customer | `0.0` |
| `is_new_city` | Binary (0/1) | Location Profile| `1` if city has never been seen for customer | `0.0` |
| `is_unusual_location` | Binary (0/1) | Location Profile| `1` if location differs from historical top regions | `0.0` |
| `geo_hop_speed_kmh` | Float | Geographical | Calculated speed of travel from previous transaction coordinates | `0.0` |
| `distance_from_previous_location_km` | Float | Geographical | Haversine distance in km from last transaction coordinates | `0.0` |
| `hour_sin` | Float | Temporal Cyclical| $\sin(2\pi \cdot \text{hour} / 24)$ | `0.0` |
| `hour_cos` | Float | Temporal Cyclical| $\cos(2\pi \cdot \text{hour} / 24)$ | `1.0` |
| `day_of_week` | Integer | Temporal | Day of week index (0=Monday, 6=Sunday) | `0.0` |
| `is_night` | Binary (0/1) | Temporal | `1` if transaction occurs between 23:00 and 06:00 local time | `0.0` |
| `is_weekend` | Binary (0/1) | Temporal | `1` if transaction occurs on Saturday or Sunday | `0.0` |
| `is_unusual_transaction_hour` | Binary (0/1) | Behavioral | `1` if transaction occurs outside user's usual diurnal window | `0.0` |
| `is_high_risk_category` | Binary (0/1) | Merchant Profile| `1` if MCC matches crypto, gambling, luxury, wire categories | `0.0` |
| `is_new_merchant_for_user`| Binary (0/1) | Merchant Profile| `1` if user has no prior transaction history with merchant | `0.0` |
