# Machine Learning Model Operations (MLOps)

This document establishes operational procedures for managing the machine learning anomaly detection lifecycle, monitoring Population Stability Index (PSI) drift, executing retraining pipelines, handling model fallbacks, and rolling back model versions for the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**.

---

## 1. ML Model Lifecycle Architecture

```mermaid
flowchart TD
    ING[Live Ingested Transactions] --> INF[Isolation Forest Inference (< 15ms)]
    INF --> DRIFT[PSI Drift Calculator]
    DRIFT -->|PSI >= 0.25| TRIG[Retraining Alert Triggered]
    TRIG --> RET[Retraining Pipeline (ml/train.py)]
    RET --> EVAL[Validation & Benchmark Suite]
    EVAL -->|Performance Approved| CAND[Candidate Artifact Registered]
    CAND -->|Admin One-Click Promote| ACT[Active Production Model (Zero-Downtime Swap)]
    ACT -->|Fallback Triggered on Error| HEUR[Heuristic Rule Fallback Engine]
```

---

## 2. Real-Time Model Telemetry & Drift Monitoring

The MLOps engineer monitors model health via the ML Monitoring dashboard (`/models`):

| Telemetry Metric | Normal Operational Range | Alert Threshold | Action Required |
| :--- | :--- | :--- | :--- |
| **Inference Latency** | $3\text{ms} - 12\text{ms}$ | P95 $> 25\text{ms}$ | Profile feature extraction overhead |
| **Inference Error Rate** | $0.00\%$ | $> 0.1\%$ | Check feature schema compatibility |
| **Anomaly Flag Rate** | $1.0\% - 5.0\%$ | $< 0.2\%$ or $> 15.0\%$ | Investigate feature scaling anomalies |
| **Population Stability Index (PSI)**| $< 0.10$ | $\ge 0.25$ | Initiate candidate model retraining |

---

## 3. Retraining Operations & Pipeline Execution

When significant feature drift is observed or a new quarterly dataset is available, initiate retraining:

### Retraining via CLI / Background Worker
```bash
# Execute model training pipeline on historical feature dataset
python ml/train.py --data-window 90d --contamination 0.02 --output ./ml/models/candidate_model.joblib
```

### Validation & Benchmark Checklist
Before promoting a candidate model to production:
1. **Inference Latency Benchmark**: Validate that candidate model scores 1,000 synthetic transactions in $< 15\text{ms}$ per item.
2. **Anomaly Score Distribution**: Confirm scores follow expected distribution (mean: $\approx 0.15$, 99th percentile: $> 0.70$).
3. **Artifact Integrity**: Ensure `.joblib` model artifact is non-empty and loads cleanly with scikit-learn.

---

## 4. Zero-Downtime Model Promotion & Rollback

### Atomic Model Promotion
* In the UI (`/models`), click **Promote Candidate Model to Active**.
* The backend atomic memory pointer swaps the active model instance in-memory without dropping incoming transaction evaluations.

### Emergency Model Rollback
If an active model exhibits unexpected anomalies in production:
1. Navigate to `/models` and select the **Model History** tab.
2. Select the previous stable model version (e.g., `model_v1.0.joblib`).
3. Click **Rollback to Version**.
4. The system immediately reloads the previous artifact into memory.

---

## 5. Fail-Safe Heuristic Engine Fallback

If an unhandled exception or memory error occurs during ML inference:
* The system catches the exception and logs an operational error with stack trace.
* The risk engine automatically falls back to **Heuristic Rule Evaluation**, adjusting rule weights to score the transaction safely without dropping the transaction or blocking user payment flows.
