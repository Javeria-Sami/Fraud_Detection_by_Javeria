# Machine Learning Anomaly Detection Architecture

## 1. Pipeline Overview

The **ML Anomaly Detection Pipeline** provides an unsupervised, reproducible, versioned, and leakage-resistant mechanism to identify anomalous financial transactions. It employs **Isolation Forest** as the foundational unsupervised algorithm, coupled with a fitted preprocessor and feature alignment to Section 06 (`FEATURE_VERSION = "v1.0.0"`).

```text
Historical Transactions
          ↓
DatasetPreparationService
(Data Quality Validation & Chronological Temporal Split)
          ↓
    MLPreprocessor
(Fitted strictly on Train Split)
          ↓
  MLTrainingService
(Isolation Forest fitting with fixed random_state)
          ↓
 MLEvaluationService
(Unsupervised Quantiles, Score Distribution, Threshold Calibration)
          ↓
Model Artifact Serialization (.joblib + .json)
          ↓
MLModelRegistryService
(Database Versioning & Lifecycle: CANDIDATE -> APPROVED -> PRODUCTION)
          ↓
 MLInferenceService
(In-Memory Singleton Inference < 1ms, Contextual Signals)
          ↓
   ml_predictions
```

---

## 2. Core Architectural Guarantees

1. **Temporal Chronological Splitting & Leakage Prevention**:
   - Training datasets are split strictly by timestamp (`70% Train`, `15% Validation`, `15% Test`).
   - `max(timestamp_train) <= min(timestamp_validation) <= min(timestamp_test)`.
   - Feature engineering and scaling parameters are fitted exclusively on the `Train` split.
2. **Deterministic Preprocessing**:
   - Identical feature scaling (`StandardScaler`), cyclical time transformations (`hour_sin`, `hour_cos`), and fallback imputation are executed during both training and real-time production inference.
3. **Threshold Calibration & Score Normalization**:
   - Isolation Forest decision function output is mapped via sigmoid calibration to a normalized range `[0.0, 1.0]` where `1.0` is highly anomalous.
   - Decision thresholds are calibrated on the validation split based on target contamination (e.g. 92nd percentile).
4. **Model Lifecycle & Versioning**:
   - Every trained model is assigned a unique version (e.g. `IF-20260921-225500`) and stored in `model_versions` with metadata and evaluation reports.
   - Models require explicit deployment promotion (`POST /models/{id}/deploy`) to become active in production.
5. **In-Memory Low-Latency Inference**:
   - The active model and fitted preprocessor are cached in memory in `MLInferenceService`, delivering sub-millisecond execution (< 1.0 ms) per transaction.
6. **Prediction Persistence & Explainability**:
   - Each inference run persists an auditable row in `ml_predictions` and generates contextual explanations based on measured feature deviations.
