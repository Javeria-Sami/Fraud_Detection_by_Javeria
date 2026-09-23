# Model Evaluation & Threshold Calibration

## 1. Unsupervised Evaluation Metrics

Because financial fraud detection operates primarily in an unsupervised or semi-supervised environment without complete real-time labels, models are evaluated on distributional properties:

- **Score Quantiles**: 25th, 50th, 75th, 90th, 95th, and 99th percentiles of normalized anomaly scores.
- **Anomaly Detection Rate**: Percentage of observations exceeding calibrated operational threshold.
- **Score Distribution**: Mean, standard deviation, minimum, and maximum scores.
- **Inference Latency**: Micro-benchmark time in milliseconds per transaction.

---

## 2. Threshold Calibration

Isolation Forest raw decision scores are converted to a normalized probability scale via sigmoid transformation:

$$\text{Anomaly Score} = \frac{1}{1 + e^{12 \cdot s}}$$

The operational decision threshold is calibrated using validation quantile scoring:

$$\tau = \text{Quantile}_{\text{val}}(1 - \text{contamination})$$

Observations where $\text{Anomaly Score} \ge \tau$ are flagged with `is_anomaly = True` and categorized as `SUSPICIOUS` or `ANOMALOUS`.

---

## 3. Labeled Evaluation

When verified dispute or investigation labels exist, standard metrics are reported without fabrication:
- **Precision**: Ratio of true frauds to all flagged anomalies.
- **Recall**: Proportion of true frauds successfully captured.
- **F1-Score**: Harmonic mean of precision and recall.
- **ROC-AUC**: Area under the receiver operating characteristic curve.
