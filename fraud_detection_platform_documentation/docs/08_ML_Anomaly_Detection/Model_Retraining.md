# Section 21: Model Retraining Pipeline

## 1. Overview & Architectural Principles

The Model Retraining Subsystem provides a controlled, reproducible, and auditable pipeline that generates candidate anomaly-detection models (`MLModelRegistry`) without automatically replacing the production model.

```
Historical Transactions & Feature Snapshots
     ↓
Data Quality Validation (Schema, Non-empty, Null timestamps, Domain bounds)
     ↓
Feature Store Extraction (features-v1)
     ↓
Chronological Temporal Splitting (Train 70% → Val 15% → Test 15%)
     ↓
Preprocessing Fitting (Fit exclusively on Training Split; Transform Val & Test)
     ↓
Isolation Forest Training (Controlled random_state seed)
     ↓
Validation Split Evaluation & Decision Threshold Calibration
     ↓
Test Split Evaluation (Score Quantiles, Anomaly Rates, Supervised Metrics if Labeled)
     ↓
Objective Comparison against Currently Deployed Active Model (Score PSI Shift, Quantile Deltas)
     ↓
Artifact Bundle Serialization with SHA256 Integrity Verification
     ↓
Candidate Model Version Registered (Status: EVALUATED)
     ↓
Controlled Operational Review (Production Model Unchanged)
```

---

## 2. Zero Automatic Deployment Guarantee

In accordance with strict MLOps principles, the retraining pipeline enforces a clean separation of lifecycle operations:

```
Retraining → Candidate Created → Evaluated → [Controlled Manual Approval] → Deployed → Monitored
```

* Retraining produces a candidate model registered with status **`EVALUATED`**.
* The currently active production model (`PRODUCTION`/`DEPLOYED`) remains **strictly unchanged** during and after retraining.
* Model promotion and activation require separate authorized operational deployment actions.

---

## 3. Data Leakage Prevention & Temporal Splitting

To prevent future-data contamination in financial time-series transactions:
1. **Strict Chronological Ordering**: Dataset rows are sorted by event timestamp ($t_1 < t_2 < \dots < t_n$).
2. **Partitioning**:
   * **Training Partition** (Oldest $70\%$): Used exclusively to fit `MLPreprocessor` scaling/encoding parameters and train the `IsolationForest` estimators.
   * **Validation Partition** (Middle $15\%$): Used to predict raw scores and calibrate decision threshold $\tau$ at target contamination.
   * **Test Partition** (Newest $15\%$): Kept completely isolated for unbiased final evaluation and comparison against the active production model.
3. **No Target Leakage**: Labels and future derived features are never accessed during preprocessor fitting.

---

## 4. Objective Model Comparison

Every completed retraining run generates a `ModelComparisonReport` evaluating the candidate model against the active deployed production model on the identical test split:
* **Score Distribution Stability**: Computes Population Stability Index (PSI) on anomaly scores ($PSI < 0.10$ indicates stability).
* **Quantile Deltas**: Compares $p_{50}$ (median score) and $p_{95}$ (tail anomaly boundary).
* **Supervised Performance**: Precision, Recall, F1-Score, and ROC-AUC are calculated only if verified dispute/case labels exist; otherwise explicitly reported as `N/A — ground-truth labels unavailable`.
* **Inference Latency Benchmark**: Verifies that candidate model inference maintains sub-50ms latency SLAs.

---

## 5. Artifact Security & Integrity

* Candidate model binaries (`isolation_forest_candidate_<version>.joblib`) and metadata JSON files are stored in `settings.MODEL_DIR`.
* Every artifact bundle includes the trained estimator, fitted preprocessor, feature names, version tags, calibrated threshold, and configuration snapshot.
* A cryptographic **SHA256 checksum** is computed and persisted in `model_retraining_runs.artifact_checksum` to guarantee tamper-evident reproducibility.

---

## 6. REST API Reference

| Endpoint | Method | RBAC Roles | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/ml-retraining/run` | POST | `admin`, `analyst` | Trigger an on-demand retraining pipeline. |
| `/api/v1/ml-retraining/runs` | GET | `admin`, `analyst`, `viewer` | List paginated historical retraining runs. |
| `/api/v1/ml-retraining/runs/{id}` | GET | `admin`, `analyst`, `viewer` | Retrieve full execution report, data quality summary, and comparison. |
| `/api/v1/ml-retraining/runs/{id}/cancel` | POST | `admin` | Cancel an in-flight retraining job. |
| `/api/v1/ml-retraining/config` | GET | `admin`, `analyst`, `viewer` | Retrieve system retraining hyperparameter defaults. |
| `/api/v1/ml-retraining/config` | PUT | `admin` | Update retraining default hyperparameters with audit logging. |

---

## 7. Database Entity

### `model_retraining_runs`
* `id` (VARCHAR(60), Primary Key)
* `model_type` (VARCHAR(100))
* `base_model_version_id` (FK to `model_versions.id`)
* `candidate_model_version_id` (FK to `model_versions.id`)
* `feature_version` (VARCHAR(50))
* `dataset_reference` (VARCHAR(255))
* `training_window_start`, `training_window_end` (DATETIME)
* `validation_window_start`, `validation_window_end` (DATETIME)
* `test_window_start`, `test_window_end` (DATETIME)
* `configuration_snapshot` (JSON)
* `status` (VARCHAR(30), Index: `QUEUED`, `RUNNING`, `VALIDATING_DATA`, `FEATURE_ENGINEERING`, `TRAINING`, `EVALUATING`, `COMPLETED`, `FAILED`, `CANCELLED`)
* `records_used` (INTEGER)
* `started_at`, `completed_at` (DATETIME)
* `duration_ms` (FLOAT)
* `evaluation_report` (JSON)
* `model_comparison` (JSON)
* `data_quality_summary` (JSON)
* `artifact_checksum` (VARCHAR(100))
* `created_by` (VARCHAR(100))
* `created_at` (DATETIME)
