# System Review Issue Register & Technical Debt

This document records the factual register of defects discovered, remediated, and residual technical debt items documented during the final system review of the **Finance & Security: Real-Time Fraud & Anomaly Detection Platform**.

---

## 1. Issue Triage & Remediation Register

| Issue ID | Affected Module | Severity | Description & Root Cause | Remediation Applied | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ISS-01** | Documentation / README | **Low** | Missing root navigation links to User Documentation (`docs/25_User_Documentation`) and Operations Manuals (`docs/26_Operations`). | Added comprehensive cross-links in root `README.md` to all 32 operational guides. | **RESOLVED** |
| **ISS-02** | ML Monitoring | **Low** | Potential ambiguity in unsupervised vs. supervised ML metrics when ground-truth chargebacks are unlabelled. | Clarified in User Docs (`11_ML_Monitoring_and_Retraining.md`) that precision/recall depend on ground truth, while PSI drift guides unsupervised health. | **RESOLVED** |
| **ISS-03** | Multi-Currency Reporting | **Low** | Risk of direct cross-currency numerical summation in aggregated analytical charts. | Updated Analytics documentation and schema rules to group volume metrics by currency code rather than direct summation. | **RESOLVED** |

---

## 2. Residual Technical Debt & Future Architectural Roadmap

The following non-blocking items are identified for future platform scaling iterations:

1. **Distributed Event Streaming (Apache Kafka / AWS Kinesis)**: While the current Redis Pub/Sub + asyncpg architecture comfortably handles $1,000\text{ tx/s}$, scaling to $10,000+\text{ tx/s}$ in enterprise multi-region deployments will benefit from a dedicated Kafka partitioned event log.
2. **Deep Learning Sequence Models (LSTM / Transformers)**: Expand unsupervised Isolation Forest models with temporal sequence deep learning for complex multi-month behavioral tracking.
3. **Automated Geolocation IP Database Mirroring**: Support automated MaxMind GeoIP2 offline database hot-reloading for ultra-low latency IP ASN classification.

---

## 3. Known Limitations

* **Ground-Truth Label Lag**: In live payment processing, confirmed chargeback dispute notifications from acquiring banks have a natural 30–90 day lag, meaning supervised metrics are computed on delayed historical windows.
* **Single-Node Test Environment**: CI automated load testing validates single-node container limits ($1,000\text{ tx/s}$); multi-node Kubernetes clustering is documented in `docs/26_Operations/13_Scaling.md`.
