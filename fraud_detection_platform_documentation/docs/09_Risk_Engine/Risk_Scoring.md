# Section 09 — Risk Engine & Risk Scoring Specification

## 1. Architecture Overview

The **Risk Engine** acts as the central synthesis point of the Real-Time Fraud & Anomaly Detection Platform. It receives heterogeneous anomaly signals from the **Rule Engine** (Section 07), the **ML Engine** (Section 08), and the **Feature Engineering Store** (Section 06), applying a deterministic, explainable mathematical formulation to output a single calibrated **Risk Score (0–100)** and categorical **Risk Band**.

```
Transaction Event
       │
       ├───────────────────────────────────┐
       ▼                                   ▼
┌──────────────┐                   ┌──────────────┐
│ Rule Engine  │                   │  ML Engine   │
│ (Section 07) │                   │ (Section 08) │
└──────┬───────┘                   └──────┬───────┘
       │                                  │
       ▼ Rule Signals                     ▼ ML Probability
  ┌──────────────────────────────────────────────┐
  │                 RISK ENGINE                  │
  │                                              │
  │  1. Signal Normalization & Verification      │
  │  2. Diminishing Rule Aggregation (Anti-Infl) │
  │  3. Behavioral Context Vector Scoring        │
  │  4. Weighted Multi-Signal Blending           │
  │  5. Severity Floor Overrides                 │
  │  6. Hard Clamping [0.0, 100.0]               │
  │  7. Deterministic Risk Band Classification   │
  │  8. Structured Explainability Generation     │
  └──────────────────────┬───────────────────────┘
                         │
                         ▼
                    Risk Result
         (Score, Band, Factors, Evidence)
                         │
                         ▼
              Section 10 (Alert Engine)
```

---

## 2. Mathematical Scoring Formula

### 2.1 Multi-Signal Blended Score
When all signal sources are present:

$$\text{RawScore} = (W_{\text{rule}} \cdot S_{\text{rule}}) + (W_{\text{ml}} \cdot S_{\text{ml}}) + (W_{\text{beh}} \cdot S_{\text{beh}})$$

Where:
* $S_{\text{rule}} \in [0.0, 100.0]$: Aggregated rule score.
* $S_{\text{ml}} \in [0.0, 100.0]$: Normalized ML anomaly score ($P_{\text{anomaly}} \times 100$).
* $S_{\text{beh}} \in [0.0, 100.0]$: Behavioral context score.
* Default Component Weights:
  * $W_{\text{rule}} = 0.50$ (50%)
  * $W_{\text{ml}} = 0.35$ (35%)
  * $W_{\text{beh}} = 0.15$ (15%)
  * $\sum W = 1.00$

### 2.2 Diminishing Rule Score Aggregation (Anti-Inflation)
To prevent correlated rule triggers (e.g. `RAPID_TRANSACTIONS` and `HIGH_VELOCITY`) from inflating scores beyond reason, triggered rules are ordered by awarded points descending and aggregated via a geometric diminishing factor $\gamma = 0.60$:

$$S_{\text{rule}} = \min\left(100.0, \sum_{i=0}^{N-1} \text{Points}_i \cdot \gamma^i\right)$$

* First triggered rule contributes **100%** of its points.
* Second triggered rule contributes **60%** of its points.
* Third triggered rule contributes **36%** of its points.
* $k$-th rule contributes $\gamma^{k-1}$ of its points.

### 2.3 Severity Floor Guarantees
To ensure high-severity fraud indicators are not diluted by a low ML score, critical overrides enforce calibrated minimum floor scores:
* If any triggered rule has severity `CRITICAL`: $\text{Score} = \max(91.0, \text{Score})$
* If any triggered rule has severity `HIGH`: $\text{Score} = \max(71.0, \text{Score})$

### 2.4 Final Clamping
$$\text{FinalRiskScore} = \max(0.0, \min(100.0, \text{Score}))$$

---

## 3. Risk Bands & Boundary Behavior

Risk classification is completely deterministic with strict, non-overlapping boundary conditions:

| Risk Level | Score Range | Default Action / Posture |
| :--- | :--- | :--- |
| **LOW** | `0.0` to `30.0` | Transaction approved; normal operational logging. |
| **MEDIUM** | `30.1` to `70.0` | Elevated risk; heightened monitoring and friction checks. |
| **HIGH** | `70.1` to `90.0` | High anomaly; priority analyst review queue. |
| **CRITICAL** | `90.1` to `100.0` | Severe fraud probability; immediate containment / block. |

---

## 4. Missing Signal Strategy & Graceful Degradation

If any subsystem is unavailable:
1. **ML Signal Unavailable / NaN**:
   * Rebalance remaining weights proportionally:
     $$W'_{\text{rule}} = \frac{W_{\text{rule}}}{W_{\text{rule}} + W_{\text{beh}}} \approx 0.769$$
     $$W'_{\text{beh}} = \frac{W_{\text{beh}}}{W_{\text{rule}} + W_{\text{beh}}} \approx 0.231$$
   * Set result status to `PARTIAL`.
   * ML factor marked as unavailable in evidence logs.
2. **Rule Engine Unavailable**:
   * Evaluates ML and behavioral signals with status `PARTIAL`.
3. **Feature Context Missing**:
   * Assumes neutral baseline ($S_{\text{beh}} = 0.0$).

---

## 5. Explainability & Evidence Architecture

Every risk evaluation outputs a list of structured `RiskExplanationFactor` records containing:
* `factor_name`: Clean human-readable title.
* `code`: Machine-readable identifier (e.g. `RULE_HIGH_AMOUNT`, `ML_ISOLATION_FOREST`, `BEHAVIOR_VELOCITY`).
* `weight`: Relative weight applied in calculation.
* `score`: Sub-score awarded by the signal.
* `contribution`: Absolute points contributed to the final score.
* `description`: Explainable narrative explaining why this signal fired.
* `evidence`: Structured key-value dictionary with real values (e.g. `{"amount": 85000, "historical_avg": 12500, "ratio": 6.8}`).

---

## 6. Auditability & Immutability

* Every calculation records `scoring_version` (`risk-v1.0.0`), `rule_version`, `model_version`, and `feature_version`.
* Persisted in the `risk_scores` database table with foreign key linkage to `transactions.id`.
* Safe idempotency: Repeated calculations update the existing record cleanly without creating duplicate records or altering past audit versions.
* Changes to scoring configuration via `PATCH /api/v1/risk/config` are restricted to administrators and logged in the immutable `audit_logs` table.

---

## 7. Product Configuration vs. Industry Standards Notice

The thresholds (0–30, 30.1–70, 70.1–90, 90.1–100) and weights (0.50 rule, 0.35 ML, 0.15 behavior) defined in this system represent **product configuration parameters calibrated for this platform** and should not be construed as universal statutory financial standards.
