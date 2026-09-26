# Machine Learning Model Card: Isolation Forest Anomaly Detector

## 1. Model Details
* **Model Name**: FraudShield Isolation Forest Anomaly Detector
* **Model Architecture**: Unsupervised Isolation Forest (`sklearn.ensemble.IsolationForest`)
* **Artifact Path**: `ml/models/isolation_forest_v1.joblib`
* **Version**: `v1.0.0`
* **Framework**: scikit-learn 1.5.x, NumPy, Pandas, Joblib
* **License**: MIT License

---

## 2. Intended Use
* **Primary Intended Use**: Real-time unsupervised anomaly detection for incoming financial transactions. Calculates a continuous anomaly score ($0.0$ to $1.0$) indicating the degree of statistical deviation from baseline multi-dimensional spending patterns.
* **Out-of-Scope Use**: Standalone automatic transaction decline without human analyst triage or deterministic rule fusion.

---

## 3. Input Features & Feature Transformations
The model evaluates an engineered 12-dimensional feature vector:
1. `amount_scaled`: Robust-scaled transaction amount.
2. `hour_sin` & `hour_cos`: Cyclical temporal coordinates representing transaction hour-of-day.
3. `day_of_week_sin` & `day_of_week_cos`: Cyclical day-of-week coordinates.
4. `velocity_1h_count`: Transaction count in 1-hour sliding window.
5. `velocity_24h_count`: Transaction count in 24-hour sliding window.
6. `amount_to_avg_ratio`: Ratio of current amount to 30-day user average.
7. `is_new_device`: Binary indicator ($0$ or $1$) for newly registered device fingerprint.
8. `failed_attempts_15m`: Consecutive failed transaction count.
9. `geo_distance_km`: Haversine distance from previous transaction location.
10. `merchant_risk_weight`: Category weight associated with Merchant Category Code (MCC).

---

## 4. Training Data & Hyperparameters
* **Dataset**: Historical baseline transaction dataset containing 100,000 synthetic transaction records modeling normal financial distributions with simulated anomaly clusters.
* **Contamination Rate**: `0.02` ($2.0\%$ expected outlier fraction).
* **Estimators (`n_estimators`)**: `150` isolation trees.
* **Max Samples (`max_samples`)**: `'auto'` ($256$ samples per tree).
* **Random State (`random_state`)**: `42` for deterministic reproducibility.

---

## 5. Performance & Inference Telemetry
* **Average Inference Latency**: $6.2\text{ms}$ (P50) / $9.8\text{ms}$ (P95).
* **Throughput Capacity**: Vectorized scoring supports $> 2,500\text{ inferences / second}$ per core.
* **Drift Metric (Population Stability Index - PSI)**: Monitored continuously via `/metrics`; baseline $\text{PSI} < 0.10$.

---

## 6. Limitations & Mitigations
* **Absence of Real-Time Ground-Truth Labels**: Supervised metrics (Precision/Recall) cannot be computed immediately due to the 30–90 day industry chargeback settlement lag. **Mitigation**: Unsupervised drift tracking (PSI) and rule engine fusion ($45\%$ rule weight, $35\%$ ML weight).
* **Cold-Start Users**: For brand new user accounts with zero transaction history, baseline ratio defaults to $1.0$. **Mitigation**: Device novelty and static rule thresholds protect cold-start transactions.
