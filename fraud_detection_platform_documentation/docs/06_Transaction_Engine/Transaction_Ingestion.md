# Transaction Ingestion Layer

## 1. Architecture Overview

The Transaction Ingestion layer serves as the single authoritative, secure gateway for all incoming financial transactions into the **Real-Time Fraud & Anomaly Detection Platform**.

```text
Incoming Transaction Payload / Simulator Stream
                      ↓
           Authentication (JWT Bearer)
                      ↓
       Authorization (RBAC: transaction.create)
                      ↓
            Request Schema Validation
      (Pydantic V2 Type & Boundary Checking)
                      ↓
                Normalization
   (Whitespace Trimming, Upper Casing, UTC Timestamps)
                      ↓
        Entity Reference Verification
      (User, Merchant, Device validation)
                      ↓
          Idempotency & Duplicate Check
     (Unique DB Key / Idempotent Replay Handling)
                      ↓
           Atomic Database Transaction
                      ↓
          Structured Response Returned
```

---

## 2. Ingestion Endpoints

### 2.1 Create / Ingest Transaction
- **Path**: `POST /api/v1/transactions`
- **Authentication**: Required (`Bearer <token>`)
- **Required Permission**: `transaction.create` (Admin / Analyst)
- **Optional Headers**: `Idempotency-Key: <unique-key>`

#### Request Payload Specification (`TransactionCreate`):
```json
{
  "transaction_id": "TXN-10001",
  "user_id": "USR-CUST-1001",
  "user_name": "John Doe",
  "merchant_id": "MERCH-AMAZON",
  "merchant_name": "Amazon Web Retail",
  "merchant_category": "Electronics & Retail",
  "amount": 249.99,
  "currency": "USD",
  "payment_method": "CREDIT_CARD",
  "transaction_type": "PURCHASE",
  "device_id": "DEV-MACBOOK-01",
  "ip_address": "198.51.100.12",
  "city": "London",
  "country": "GB",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "failed_attempts": 0,
  "source": "API",
  "timestamp": "2026-09-21T22:00:00Z"
}
```

#### Response Payload Specification (`TransactionResponse`):
```json
{
  "id": "TXN-10001",
  "transaction_id": "TXN-10001",
  "user_id": "USR-CUST-1001",
  "user_name": "John Doe",
  "merchant_id": "MERCH-AMAZON",
  "merchant_name": "Amazon Web Retail",
  "merchant_category": "Electronics & Retail",
  "payment_method": "CREDIT_CARD",
  "transaction_type": "PURCHASE",
  "amount": 249.99,
  "currency": "USD",
  "device_id": "DEV-MACBOOK-01",
  "ip_address": "198.51.100.12",
  "city": "London",
  "country": "GB",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "failed_attempts": 0,
  "source": "API",
  "risk_score": 12.5,
  "risk_level": "LOW",
  "ml_anomaly_score": 0.0421,
  "rules_triggered": [],
  "risk_factors": [],
  "status": "APPROVED",
  "timestamp": "2026-09-21T22:00:00+00:00",
  "created_at": "2026-09-21T22:00:00+00:00"
}
```

---

### 2.2 Retrieve Single Transaction
- **Path**: `GET /api/v1/transactions/{transaction_id}`
- **Authentication**: Required (`Bearer <token>`)
- **Required Permission**: `transaction.read`
- **Response**: `TransactionResponse` (HTTP 200) or HTTP 404 if not found.

---

### 2.3 List Transactions with Bounded Pagination & Safe Sorting
- **Path**: `GET /api/v1/transactions`
- **Authentication**: Required (`Bearer <token>`)
- **Required Permission**: `transaction.read`
- **Query Parameters**:
  - `page`: int (default: `1`, min: `1`)
  - `page_size`: int (default: `50`, min: `1`, max: `100`)
  - `sort`: string allowlist (`timestamp`, `amount`, `created_at`, `status`, `risk_score`)
  - `order`: string (`asc` or `desc`)
  - `user_id`: string (exact filter)
  - `merchant_id`: string (exact filter)
  - `merchant_name`: string (case-insensitive partial match)
  - `device_id`: string (exact filter)
  - `status`: string (exact status match)
  - `risk_level`: string (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  - `source`: string (`API`, `SIMULATOR`, `IMPORT`, `INTERNAL`)
  - `min_amount` / `max_amount`: float
  - `search`: string (multi-column search)
- **Response Headers**:
  - `X-Total-Count`: Total number of matching records
  - `X-Page`: Current page number
  - `X-Page-Size`: Effective page size
  - `X-Total-Pages`: Total calculated pages
