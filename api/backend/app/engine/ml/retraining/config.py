"""
Dynamic MLOps Model Retraining Configuration Management.
Section 21 — Model Retraining.
"""
import json
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.audit_log import SystemSetting
from backend.app.core.audit import AuditService

DEFAULT_RETRAINING_CONFIG: Dict[str, Any] = {
    "default_model_type": "Isolation Forest",
    "default_n_estimators": 150,
    "default_contamination": 0.08,
    "default_random_state": 42,
    "default_train_ratio": 0.70,
    "default_val_ratio": 0.15,
    "default_test_ratio": 0.15,
    "minimum_training_samples": 50,
    "maximum_training_samples": 100000,
    "default_threshold_method": "CONTAMINATION",
    "default_fixed_threshold": 0.65,
    "auto_evaluate_candidate": True,
    "target_feature_version": "features-v1",
}

SETTING_KEY = "ML_RETRAINING_CONFIG"


class MLRetrainingConfigService:
    """
    Manages centralized configuration settings for model retraining pipelines.
    """

    @classmethod
    async def get_config(cls, session: AsyncSession) -> Dict[str, Any]:
        stmt = select(SystemSetting).where(SystemSetting.key == SETTING_KEY)
        setting = (await session.execute(stmt)).scalars().first()

        if not setting or not setting.value:
            return dict(DEFAULT_RETRAINING_CONFIG)

        try:
            stored = json.loads(setting.value)
            merged = dict(DEFAULT_RETRAINING_CONFIG)
            merged.update(stored)
            return merged
        except Exception:
            return dict(DEFAULT_RETRAINING_CONFIG)

    @classmethod
    async def update_config(
        cls,
        session: AsyncSession,
        updates: Dict[str, Any],
        actor_email: str = "system",
        actor_role: str = "admin"
    ) -> Dict[str, Any]:
        stmt = select(SystemSetting).where(SystemSetting.key == SETTING_KEY)
        setting = (await session.execute(stmt)).scalars().first()

        current = await cls.get_config(session)
        current.update(updates)

        if not setting:
            setting = SystemSetting(
                key=SETTING_KEY,
                value=json.dumps(current),
                description="Model Retraining MLOps Pipeline Configuration"
            )
            session.add(setting)
        else:
            setting.value = json.dumps(current)

        await AuditService.log_action(
            session=session,
            actor_email=actor_email,
            actor_role=actor_role,
            action="UPDATE_ML_RETRAINING_CONFIG",
            target_entity="SystemSetting",
            target_id=SETTING_KEY,
            details=f"Updated ML Retraining configurations: {list(updates.keys())}"
        )

        await session.commit()
        return current
