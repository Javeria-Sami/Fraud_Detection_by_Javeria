# Model Training & Preprocessing Procedure

## 1. Triggering Training via API

Administrators can initiate model training on historical transactions:

```http
POST /api/v1/models/train
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json

{
  "version": "IF-2026-001",
  "n_estimators": 150,
  "contamination": 0.08,
  "random_state": 42,
  "train_split": 0.70,
  "val_split": 0.15,
  "test_split": 0.15,
  "description": "Production Isolation Forest model trained on verified historical features."
}
```

---

## 2. Training Sequence

1. **Extraction**: `DatasetPreparationService.extract_dataset_from_db()` fetches historical transactions with feature snapshots.
2. **Quality Validation**: `DatasetPreparationService.validate_dataset_quality()` audits for non-emptiness, valid timestamps, and non-negative amounts.
3. **Temporal Split**: `DatasetPreparationService.split_chronologically()` creates `Train (70%)`, `Val (15%)`, `Test (15%)` partitions.
4. **Preprocessor Fitting**: `MLPreprocessor.fit()` calculates means and standard deviations strictly on `Train`.
5. **Model Fitting**: `sklearn.ensemble.IsolationForest` is fitted on scaled `Train` features with fixed `random_state`.
6. **Calibration**: Anomaly threshold is calibrated from the 92nd percentile of validation split scores.
7. **Evaluation**: `MLEvaluationService.evaluate()` computes unsupervised quantiles, score distribution, and test metrics.
8. **Artifact Serialization**: Payload is bundled into `artifacts/models/isolation_forest_{version}.joblib` and `metadata_{version}.json`.
9. **Registration**: Model record is inserted into `model_versions` table with status `APPROVED`.
