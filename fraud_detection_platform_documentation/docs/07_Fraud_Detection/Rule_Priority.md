# Rule Priority & Execution Order

## 1. Deterministic Execution Order

Rules are evaluated in a fixed, deterministic sequence to guarantee repeatability:

1. **`HIGH_AMOUNT`** (`AMOUNT`, Priority 1) — Evaluates baseline deviation and absolute spend.
2. **`RAPID_TRANSACTIONS`** (`VELOCITY`, Priority 2) — Evaluates short-term transaction bursts.
3. **`NEW_DEVICE`** (`DEVICE`, Priority 3) — Evaluates device fingerprint familiarity.
4. **`UNUSUAL_LOCATION`** (`LOCATION`, Priority 4) — Evaluates geographical hops and impossible travel speeds.
5. **`UNUSUAL_TIME`** (`TIME`, Priority 5) — Evaluates off-hours and temporal behavioral patterns.
6. **`FAILED_ATTEMPTS`** (`FAILED_ATTEMPTS`, Priority 6) — Evaluates pre-transaction authorization failures.
7. **`SUDDEN_SPENDING_INCREASE`** (`BEHAVIOR`, Priority 7) — Evaluates sudden velocity/volume surges.
8. **`MERCHANT_ANOMALY`** (`MERCHANT`, Priority 8) — Evaluates high-risk merchant categories (crypto, casino).
9. **`BEHAVIOR_DEVIATION`** (`BEHAVIOR`, Priority 9) — Evaluates multi-factor compound behavioral anomalies.

---

## 2. Priority vs Final Risk Score

- **Rule Priority** dictates execution sequence and error isolation boundary order.
- **Rule Weight** produces a candidate score contribution (e.g. 25 points).
- **Rule Score Sum** is an intermediate signal passed forward to the Risk Engine (Section 09).
- **The Rule Engine DOES NOT compute the final 0–100 risk score or trigger alerts directly**; it produces deterministic, explainable rule signals for downstream consumption.
