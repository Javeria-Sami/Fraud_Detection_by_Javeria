# Duplicate Detection Strategy

## 1. Distinction: Exact vs Potential Duplicates

The platform draws a clear distinction between:
- **Exact Duplicates**: Repeated submissions of the same transaction identifier (`transaction_id`). These are resolved using the platform's idempotency engine (returning the existing transaction on matching payloads or rejecting with 409 Conflict on payload conflicts).
- **Potential Duplicates**: Rapid consecutive transactions by the same user with identical or near-identical amounts at the same merchant.

---

## 2. Potential Duplicate Handling Rules

1. Potential duplicates are **NOT** automatically rejected at the ingestion layer, because legitimate cardholders frequently make repeated purchases (e.g., transit taps, subscription retries, or multiple coffees).
2. Instead, velocity and repetition indicators are passed to the **Feature Store** (Section 06) and **Rules Engine** (Section 07) to evaluate burst velocity risk without dropping valid transaction records.
