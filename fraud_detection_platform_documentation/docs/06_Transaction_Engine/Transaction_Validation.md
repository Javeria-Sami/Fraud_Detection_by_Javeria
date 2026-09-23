# Transaction Validation & Normalization Rules

## 1. Input Validation Rules

The transaction schema enforces strict type and boundary validations through Pydantic V2 model validators:

| Field | Requirement | Validation Rule | Normalization Applied |
| :--- | :--- | :--- | :--- |
| `transaction_id` | Optional / Recommended | String, max 50 chars | Unchanged or auto-generated `TXN-XXXXXX` |
| `user_id` | Required | String, min 1, max 50 | Verified against `users` table (must exist and be active) |
| `merchant_id` | Optional | String, max 50 | Verified against `merchants` table when provided |
| `amount` | Required | Numeric / Float > 0 | Strictly positive numeric value |
| `currency` | Required | Exactly 3 chars | Upper-cased (e.g., `usd` → `USD`) |
| `country` | Optional | Exactly 2 chars (ISO 3166-1) | Upper-cased (e.g., `gb` → `GB`) |
| `latitude` | Optional | Float between -90.0 and +90.0 | Verified in boundary |
| `longitude` | Optional | Float between -180.0 and +180.0 | Verified in boundary |
| `payment_method`| Required | Controlled enumeration | Upper-cased & space replaced with `_` |
| `transaction_type`| Required | Controlled enumeration | Upper-cased & space replaced with `_` |
| `timestamp` | Optional | ISO 8601 string | Parsed timezone-aware and normalized to UTC |
| `source` | Optional | API, SIMULATOR, IMPORT, INTERNAL | Default: `API`, upper-cased |

---

## 2. Entity Reference Verification

To prevent orphan data or invalid transactions:
1. **User Verification**: `user_id` must match an existing record in the `users` table. If the user does not exist, ingestion is rejected with **HTTP 404 Not Found**. If the user is inactive, ingestion is rejected with **HTTP 403 Forbidden**.
2. **Merchant Verification**: If `merchant_id` is supplied, it must match an active record in `merchants`.
3. **Device Verification**: If `device_id` is supplied, it is checked against registered device profiles.

---

## 3. Financial Data Privacy Safeguard

The platform **never** accepts or stores raw financial credentials:
- ❌ Primary Account Numbers (PAN / full card numbers)
- ❌ Card Verification Values (CVV / CVC)
- ❌ PINs or banking credentials
- ✅ Only tokenized identifiers, payment instrument types (`CREDIT_CARD`, `DEBIT_CARD`, `WIRE_TRANSFER`, etc.), and masked fingerprints are accepted.
