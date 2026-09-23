# Idempotency Architecture

## 1. Core Principle
A transaction ingestion request must be safely repeatable without creating unintended duplicate financial records, duplicate risk scores, or phantom alerts.

---

## 2. Idempotency Mechanisms

1. **Transaction Identifier Uniqueness**:
   - `transactions.transaction_id` and `transactions.id` have unique indexes enforced at the PostgreSQL / SQLite database engine level.
2. **Idempotency Key Header**:
   - Clients may supply an `Idempotency-Key` header with requests. If supplied and `transaction_id` is omitted, the key is used as the transaction's primary identifier.
3. **Idempotent Replay Handling**:
   - When a transaction with an existing `transaction_id` is submitted:
     - **Matching Attributes (Same user, amount, merchant)**: The platform identifies this as an idempotent retry (e.g. client network retry), returning the existing transaction record with **HTTP 200 OK** and the header `X-Idempotent-Replay: true`.
     - **Conflicting Attributes (Different amount, user, or currency)**: The platform rejects the request with **HTTP 409 Conflict** (`"Transaction ID '...' already exists with conflicting details."`).
4. **Race-Condition & Concurrency Protection**:
   - Database unique constraint violation triggers `IntegrityError` upon concurrent ingestion. The transaction session rolls back cleanly and returns the existing transaction or conflict error.
