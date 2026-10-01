"""
Feature Store Integration Layer.
Section 06 — Feature Engineering.
Provides centralized access to real-time and historical feature computation.
"""
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.engine.features.service import FeatureEngineeringService
from backend.app.engine.features.location import haversine_distance_km

class FeatureStore:
    @staticmethod
    async def extract_features(
        session: AsyncSession,
        txn_dict: Dict[str, Any],
        reference_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Extracts full feature snapshot using the standardized Section 06 Feature Engineering Service.
        """
        return await FeatureEngineeringService.extract_features(
            session=session,
            txn_dict=txn_dict,
            reference_time=reference_time
        )
