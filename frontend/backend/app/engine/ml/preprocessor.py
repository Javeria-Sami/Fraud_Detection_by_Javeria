"""
ML Feature Preprocessing and Scaling Pipeline.
Section 08 — ML Anomaly Detection.

Ensures identical feature transformations during training and real-time production inference.
"""
from typing import List, Dict, Any, Union, Optional
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from backend.app.engine.features.registry import FEATURE_VERSION

# Standardized, versioned list of numerical & categorical-derived features
ML_FEATURE_NAMES: List[str] = [
    "amount",
    "amount_deviation",
    "velocity_1m",
    "velocity_5m",
    "velocity_10m",
    "velocity_1h",
    "velocity_24h",
    "volume_5m",
    "volume_1h",
    "volume_24h",
    "failed_attempts",
    "is_new_device",
    "device_transaction_count",
    "is_new_country",
    "is_new_city",
    "is_unusual_location",
    "geo_hop_speed_kmh",
    "distance_from_previous_location_km",
    "hour_sin",
    "hour_cos",
    "day_of_week",
    "is_night",
    "is_weekend",
    "is_unusual_transaction_hour",
    "is_high_risk_category",
    "is_new_merchant_for_user"
]


class MLPreprocessor:
    """
    Stateful feature preprocessor for Isolation Forest anomaly detection.
    Computes cyclical encodings, imputes missing values, and applies fitted feature scaling.
    """

    def __init__(self, feature_version: str = FEATURE_VERSION):
        self.feature_version = feature_version
        self.feature_names = list(ML_FEATURE_NAMES)
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.imputation_defaults: Dict[str, float] = {
            "amount": 0.0,
            "amount_deviation": 1.0,
            "velocity_1m": 1.0,
            "velocity_5m": 1.0,
            "velocity_10m": 1.0,
            "velocity_1h": 1.0,
            "velocity_24h": 1.0,
            "volume_5m": 0.0,
            "volume_1h": 0.0,
            "volume_24h": 0.0,
            "failed_attempts": 0.0,
            "is_new_device": 0.0,
            "device_transaction_count": 1.0,
            "is_new_country": 0.0,
            "is_new_city": 0.0,
            "is_unusual_location": 0.0,
            "geo_hop_speed_kmh": 0.0,
            "distance_from_previous_location_km": 0.0,
            "hour_sin": 0.0,
            "hour_cos": 1.0,
            "day_of_week": 0.0,
            "is_night": 0.0,
            "is_weekend": 0.0,
            "is_unusual_transaction_hour": 0.0,
            "is_high_risk_category": 0.0,
            "is_new_merchant_for_user": 0.0
        }

    def _extract_raw_matrix(self, data: Union[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]) -> np.ndarray:
        """Converts diverse input formats into a raw unscaled numpy matrix."""
        if isinstance(data, dict):
            # Fast path for single dict inference (sub-millisecond)
            hour = float(data.get("hour_of_day", 12.0))
            hour_sin = float(data.get("hour_sin", np.sin(2 * np.pi * hour / 24.0)))
            hour_cos = float(data.get("hour_cos", np.cos(2 * np.pi * hour / 24.0)))

            row = []
            for col in self.feature_names:
                if col == "hour_sin":
                    row.append(hour_sin)
                elif col == "hour_cos":
                    row.append(hour_cos)
                else:
                    val = data.get(col, self.imputation_defaults.get(col, 0.0))
                    try:
                        fval = float(val)
                        if np.isnan(fval) or np.isinf(fval):
                            fval = self.imputation_defaults.get(col, 0.0)
                    except (ValueError, TypeError):
                        fval = self.imputation_defaults.get(col, 0.0)
                    row.append(fval)
            return np.array([row], dtype=np.float64)

        elif isinstance(data, list):
            df = pd.DataFrame(data)
        elif isinstance(data, pd.DataFrame):
            df = data.copy()
        else:
            raise TypeError(f"Unsupported input data type: {type(data)}")

        # Cyclical hour computation if not already present
        if "hour_sin" not in df.columns or "hour_cos" not in df.columns:
            hours = df["hour_of_day"].values if "hour_of_day" in df.columns else np.full(len(df), 12.0)
            hours = np.nan_to_num(hours.astype(float), nan=12.0)
            df["hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
            df["hour_cos"] = np.cos(2 * np.pi * hours / 24.0)

        # Impute missing or missing columns
        for col in self.feature_names:
            default_val = self.imputation_defaults.get(col, 0.0)
            if col not in df.columns:
                df[col] = default_val
            else:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(default_val)
                # Clip infinite values
                df[col] = df[col].replace([np.inf, -np.inf], default_val)

        return df[self.feature_names].values.astype(np.float64)

    def fit(self, train_data: Union[pd.DataFrame, List[Dict[str, Any]]]) -> "MLPreprocessor":
        """Fits StandardScaler on training split only."""
        X_raw = self._extract_raw_matrix(train_data)
        self.scaler.fit(X_raw)
        self.is_fitted = True
        return self

    def transform(self, data: Union[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]) -> np.ndarray:
        """Transforms input data into scaled feature matrix."""
        if not self.is_fitted:
            raise ValueError("MLPreprocessor is not fitted yet.")
        X_raw = self._extract_raw_matrix(data)
        return self.scaler.transform(X_raw)

    def fit_transform(self, train_data: Union[pd.DataFrame, List[Dict[str, Any]]]) -> np.ndarray:
        """Fits scaler on training split and transforms it in one step."""
        return self.fit(train_data).transform(train_data)
