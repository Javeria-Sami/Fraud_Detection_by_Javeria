"""
Historical Dataset Preparation and Quality Validation Service.
Section 08 — ML Anomaly Detection.

Extracts historical feature datasets, performs data quality audits,
and conducts strict chronological temporal splitting to prevent future-data leakage.
"""
from typing import Tuple, List, Dict, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.models.transaction import Transaction, FeatureSnapshot
from backend.app.engine.feature_store import FeatureStore
from backend.app.engine.features.registry import FEATURE_VERSION
from backend.app.engine.ml.preprocessor import ML_FEATURE_NAMES


class DataQualityError(ValueError):
    """Raised when training dataset fails quality validation."""
    pass


class DatasetPreparationService:
    """
    Handles training dataset extraction, validation, and chronological splitting.
    """

    @classmethod
    async def extract_dataset_from_db(
        cls,
        session: AsyncSession,
        limit: Optional[int] = None,
        min_samples: int = 50
    ) -> pd.DataFrame:
        """
        Loads historical transactions with feature snapshots from the database.
        If feature snapshots are missing, dynamically generates features via FeatureStore.
        """
        stmt = (
            select(Transaction)
            .options(selectinload(Transaction.feature_snapshot))
            .where(Transaction.amount > 0)
            .order_by(Transaction.timestamp.asc(), Transaction.created_at.asc())
        )
        if limit:
            stmt = stmt.limit(limit)

        res = await session.execute(stmt)
        transactions = res.scalars().all()

        if len(transactions) < min_samples:
            raise DataQualityError(
                f"Insufficient historical data: found {len(transactions)} valid transactions, "
                f"minimum required for ML training is {min_samples}."
            )

        rows: List[Dict[str, Any]] = []
        for txn in transactions:
            # 1. Check if FeatureSnapshot exists
            snap = txn.feature_snapshot
            if snap and snap.features:
                feat_dict = dict(snap.features)
            else:
                txn_dict = {
                    "id": txn.id,
                    "transaction_id": txn.transaction_id,
                    "user_id": txn.user_id,
                    "merchant_id": txn.merchant_id,
                    "merchant_name": txn.merchant_name,
                    "merchant_category": txn.merchant_category,
                    "amount": float(txn.amount),
                    "currency": txn.currency,
                    "payment_method": txn.payment_method,
                    "device_id": txn.device_id,
                    "city": txn.city,
                    "country": txn.country,
                    "latitude": txn.latitude,
                    "longitude": txn.longitude,
                    "failed_attempts": txn.failed_attempts,
                    "transaction_timestamp": txn.transaction_timestamp or txn.timestamp
                }
                feat_dict = await FeatureStore.extract_features(
                    session=session,
                    txn_dict=txn_dict,
                    reference_time=txn.transaction_timestamp or txn.timestamp
                )

            # Metadata fields
            feat_dict["transaction_id"] = txn.id
            feat_dict["timestamp"] = txn.transaction_timestamp or txn.timestamp or txn.created_at
            feat_dict["amount"] = float(txn.amount)
            # Label ground truth if available (e.g. from disputes / status)
            feat_dict["is_fraud"] = 1 if (txn.status in ["BLOCKED", "DECLINED"] or txn.risk_level == "CRITICAL") else 0
            rows.append(feat_dict)

        df = pd.DataFrame(rows)
        cls.validate_dataset_quality(df)
        return df

    @classmethod
    def validate_dataset_quality(cls, df: pd.DataFrame) -> bool:
        """
        Validates dataset for non-emptiness, valid timestamps, and absence of corrupted rows.
        """
        if df.empty:
            raise DataQualityError("Dataset is empty.")

        # Check timestamp ordering and validity
        if "timestamp" in df.columns:
            if df["timestamp"].isnull().any():
                raise DataQualityError("Dataset contains null timestamps.")

        # Check required numeric feature bounds
        if "amount" in df.columns:
            if (df["amount"] <= 0).any():
                raise DataQualityError("Dataset contains non-positive transaction amounts.")

        return True

    @classmethod
    def split_chronologically(
        cls,
        df: pd.DataFrame,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Splits dataset chronologically to avoid future-data leakage.
        Ensures: Train (oldest) -> Validation (middle) -> Test (newest).
        """
        if not np.isclose(train_ratio + val_ratio + test_ratio, 1.0):
            raise ValueError(f"Split ratios must sum to 1.0, got {train_ratio + val_ratio + test_ratio}")

        # Ensure sorted by timestamp
        if "timestamp" in df.columns:
            sorted_df = df.sort_values(by="timestamp").reset_index(drop=True)
        else:
            sorted_df = df.reset_index(drop=True)

        n = len(sorted_df)
        train_end = int(n * train_ratio)
        val_end = int(n * (train_ratio + val_ratio))

        train_df = sorted_df.iloc[:train_end].copy()
        val_df = sorted_df.iloc[train_end:val_end].copy()
        test_df = sorted_df.iloc[val_end:].copy()

        return train_df, val_df, test_df
