# Section 16 — 360-Degree Entity Risk Profiling Architecture

## 1. Overview & Architectural Role

The **Risk Profiling Subsystem** provides historical behavioral context for Users, Devices, and Merchants to assist fraud analysts during security investigations.

```
+------------------------------------------------------------------------------------+
|                                 CORE PRINCIPLE                                     |
|                                                                                    |
|   Transaction Risk (Sec 09)  +  Entity Behavioral Context (Sec 16)                 |
|                     = Enhanced Analyst Understanding                               |
|                                                                                    |
|   * Risk Profiling does NOT override the transaction Risk Engine score             |
|   * Risk Profiling produces descriptive, evidence-backed contextual signals        |
+------------------------------------------------------------------------------------+
```

---

## 2. Profile Types & Dimensions

### A. User Risk Profile
- **Financial Baselines**: Average transaction amount, median (50th percentile), minimum, maximum, standard deviation, and cumulative lifetime volume.
- **Transaction Reliability**: Success vs. failed count, failure rate percentage.
- **Habitual Hours**: 24-hour UTC distribution identifying regular vs. anomalous transaction windows.
- **Geographic Footprint**: High-frequency cities and countries.
- **Authorized Hardware**: Set of verified device fingerprints.
- **Merchant Diversity**: Set and frequency of transacted merchant entities.
- **Contextual Signals**: Evidence-backed alerts such as `AMOUNT_ABOVE_HISTORICAL_MEDIAN`, `OUTSIDE_TYPICAL_HOURS`, and `NEW_DEVICE_FOR_USER`.

### B. Device Risk Profile
- **Hardware Telemetry**: Unique device identifier fingerprints.
- **Multi-Account Sharing**: Association metrics tracking multiple user accounts transacting on the same device (`DEVICE_SHARED_BY_USERS`).
- **Failure Telemetry**: Failed attempts count, transaction failure rate (`HIGH_DEVICE_FAILURE_RATE`).
- **Merchant Footprint**: Distinct merchants transacted through this hardware.
- **Observed Geographies**: Locations where device fingerprint was recorded.

### C. Merchant Risk Profile
- **Category Risk Tiers**: Baseline risk categorization (`crypto_exchange`, `luxury_goods`, `money_transfer`, `gambling`, `online_retail`).
- **Volume & Value**: Cumulative volume, total transaction count, average and median transaction size.
- **Customer Base**: Unique users count and unique device fingerprints.
- **Chargeback / Failure Rate**: Failure rate percentage and risk signals (`HIGH_MERCHANT_FAILURE_RATE`).

---

## 3. Cold Start & Entity Lifecycle

To avoid misleading default values (e.g. artificial 0s or false fraud assertions for new accounts), the system uses explicit lifecycle states:

| Lifecycle State | Transaction Threshold | Behavior & Baseline Handling |
| :--- | :--- | :--- |
| `NEW_ENTITY` | 0 transactions | Baselines initialized with 0; contextual flags indicate lack of history. |
| `LIMITED_HISTORY` | 1 to 4 transactions | Initial baseline calculations; flags notify analysts of low sample size. |
| `ESTABLISHED` | 5+ transactions | Full statistical baselines (mean, median, std dev, habitual hours, geo trails). |

---

## 4. Temporal Data Leakage Prevention

All profiling algorithms strictly respect historical evaluation timestamps via the `as_of` query parameter:

```sql
-- All behavioral aggregations strictly filter before evaluation time:
WHERE timestamp <= :as_of_time
```

This guarantees that future transactions cannot leak into historical profile evaluations during model training, backtesting, or historical investigation.

---

## 5. API Endpoints

- `GET /api/v1/risk-profiles/stats` — Aggregate metrics (tracked users, high-risk users, shared devices, active merchants).
- `GET /api/v1/risk-profiles/users` — List and filter user risk profiles.
- `GET /api/v1/risk-profiles/users/{user_id}` — 360-degree user behavioral baseline and contextual signals (`?as_of=...` supported).
- `GET /api/v1/risk-profiles/devices` — List and filter device risk profiles.
- `GET /api/v1/risk-profiles/devices/{device_id}` — Deep device profile with multi-user sharing (`?as_of=...` supported).
- `GET /api/v1/risk-profiles/merchants` — List and filter merchant profiles.
- `GET /api/v1/risk-profiles/merchants/{merchant_name}` — Merchant category risk tiers and volume stats (`?as_of=...` supported).
- `GET /api/v1/risk-profiles/{entity_type}/{entity_id}/summary` — Compact unified summary endpoint for drawers/modals.
- `POST /api/v1/risk-profiles/recalculate` — Admin/Analyst on-demand recalculation trigger.

---

## 6. Frontend Workspace

The frontend workspace at `/risk-profiles` provides:
1. **ProfilesHeader**: Navigation tabs, real-time status pill, and recalculation trigger.
2. **ProfileKPIs**: Real-time summary metric cards with live high-risk and shared-device indicators.
3. **UserProfileView**: 360° inspector with spending baseline cards, 24-hour habitual time matrix, device fingerprint tags, and cross-navigation to Transaction Explorer, Alert Center, and Cases.
4. **DeviceProfileView**: Hardware telemetry inspector with multi-user sharing badges and failure rates.
5. **MerchantProfileView**: Category risk tier analysis, volume statistics, and customer base distributions.
