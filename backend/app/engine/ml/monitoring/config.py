"""
Dynamic System Configuration for Model Monitoring & MLOps.
Section 20 — Model Monitoring & MLOps.
"""
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.models.audit_log import SystemSetting
from backend.app.core.audit import AuditService


SETTING_KEY_ML_MONITORING = "ML_MONITORING_CONFIG"

DEFAULT_ML_MONITORING_CONFIG: Dict[str, Any] = {
    "psi_warning_threshold": 0.10,
    "psi_critical_threshold": 0.25,
    "ks_pvalue_critical": 0.01,
    "latency_p95_warning_ms": 100.0,
    "latency_p95_critical_ms": 250.0,
    "min_sample_size": 15,
    "max_acceptable_missing_pct": 5.0,
    "anomaly_rate_warning_pct": 35.0,
    "default_monitoring_window_hours": 24,
    "default_reference_window_days": 7
}


class MLMonitoringConfigService:
    """Manages dynamic retrieval and audit-logged updates for ML monitoring thresholds."""

    @classmethod
    async def get_config(cls, session: AsyncSession) -> Dict[str, Any]:
        stmt = select(SystemSetting).where(SystemSetting.key == SETTING_KEY_ML_MONITORING)
        setting = (await session.execute(stmt)).scalar_one_or_none()
        if setting and isinstance(setting.value, dict):
            cfg = dict(DEFAULT_ML_MONITORING_CONFIG)
            cfg.update(setting.value)
            return cfg
        return dict(DEFAULT_ML_MONITORING_CONFIG)

    @classmethod
    async def update_config(
        cls,
        session: AsyncSession,
        updates: Dict[str, Any],
        actor_email: str = "admin@bank-soc.internal",
        actor_role: str = "admin"
    ) -> Dict[str, Any]:
        stmt = select(SystemSetting).where(SystemSetting.key == SETTING_KEY_ML_MONITORING)
        setting = (await session.execute(stmt)).scalar_one_or_none()

        old_cfg = dict(DEFAULT_ML_MONITORING_CONFIG)
        if setting and isinstance(setting.value, dict):
            old_cfg.update(setting.value)

        new_cfg = dict(old_cfg)
        for k, v in updates.items():
            if k in DEFAULT_ML_MONITORING_CONFIG and v is not None:
                new_cfg[k] = v

        if not setting:
            setting = SystemSetting(
                key=SETTING_KEY_ML_MONITORING,
                value=new_cfg,
                description="Model Monitoring and MLOps statistical drift and health thresholds"
            )
            session.add(setting)
        else:
            setting.value = new_cfg

        await AuditService.log_action(
            session=session,
            actor_email=actor_email,
            actor_role=actor_role,
            action="ML_MONITORING_CONFIG_UPDATE",
            target_entity="SystemSetting",
            target_id=SETTING_KEY_ML_MONITORING,
            diff_old=old_cfg,
            diff_new=new_cfg,
            details="Updated ML monitoring thresholds and parameters"
        )
        await session.commit()
        await session.refresh(setting)

        return new_cfg
