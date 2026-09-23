"""
Alert Engine Configuration and Threshold Calibration.
Section 10 & Section 19 — Configurable Alerts & Rule Administration.
"""
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field, field_validator, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.engine.alerts.types import AlertType, AlertSeverity, AlertPriority
from backend.app.models.audit_log import SystemSetting
from backend.app.core.audit import AuditService

ALERT_CONFIG_VERSION = "alert-v1.0.0"
ALERT_CONFIG_SETTING_KEY = "ALERT_ENGINE_CONFIG"


class AlertEngineConfig(BaseModel):
    """Centralized configuration for alert generation, thresholds, priorities, and cooldowns."""
    alert_config_version: str = ALERT_CONFIG_VERSION

    # Risk thresholds triggering automated operational alerts
    high_risk_threshold: float = Field(70.1, ge=0.0, le=100.0)
    critical_risk_threshold: float = Field(90.1, ge=0.0, le=100.0)

    # ML Anomaly probability threshold for standalone ML alerts
    ml_anomaly_threshold: float = Field(0.85, ge=0.0, le=1.0)

    # Alert storm suppression / Cooldown parameters
    cooldown_seconds: int = Field(300, ge=0, description="Deduplication window in seconds (default: 5m)")
    enable_cooldown: bool = True
    enable_critical_cooldown_override: bool = True

    # Enabled Alert Types
    enabled_alert_types: List[str] = Field(
        default_factory=lambda: [
            AlertType.CRITICAL_RISK_TRANSACTION.value,
            AlertType.HIGH_RISK_TRANSACTION.value,
            AlertType.RULE_TRIGGERED.value,
            AlertType.ML_ANOMALY.value,
            AlertType.RAPID_TRANSACTION_ACTIVITY.value,
            AlertType.NEW_DEVICE_RISK.value,
            AlertType.UNUSUAL_LOCATION.value,
            AlertType.HIGH_AMOUNT.value,
            AlertType.FAILED_ATTEMPT_PATTERN.value,
        ]
    )

    # Severity to Priority Mapping
    severity_priority_map: Dict[str, str] = Field(
        default_factory=lambda: {
            AlertSeverity.CRITICAL.value: AlertPriority.P1.value,
            AlertSeverity.HIGH.value: AlertPriority.P2.value,
            AlertSeverity.MEDIUM.value: AlertPriority.P3.value,
            AlertSeverity.LOW.value: AlertPriority.P4.value,
        }
    )

    @field_validator("critical_risk_threshold")
    @classmethod
    def validate_critical_threshold(cls, v: float, info) -> float:
        high = info.data.get("high_risk_threshold", 70.1)
        if v < high:
            raise ValueError(f"critical_risk_threshold ({v}) must be >= high_risk_threshold ({high}).")
        return v

    model_config = ConfigDict(from_attributes=True)


# Default global configuration instance
default_alert_config = AlertEngineConfig()


class AlertConfigService:
    """Service to load and persist dynamic alert engine configuration from database."""

    @classmethod
    async def get_config(cls, db: AsyncSession) -> Tuple[AlertEngineConfig, Optional[str], Optional[str]]:
        """
        Retrieves current active AlertEngineConfig from SystemSetting or returns default.
        Returns (config, updated_at, updated_by).
        """
        stmt = select(SystemSetting).where(SystemSetting.key == ALERT_CONFIG_SETTING_KEY)
        res = await db.execute(stmt)
        setting = res.scalar_one_or_none()

        if not setting or not setting.value:
            return default_alert_config, None, None

        try:
            val = json.loads(setting.value) if isinstance(setting.value, str) else setting.value
            cfg = AlertEngineConfig(**val)
            u_at = setting.updated_at.isoformat() if setting.updated_at else None
            return cfg, u_at, setting.updated_by
        except Exception:
            return default_alert_config, None, None

    @classmethod
    async def update_config(
        cls,
        db: AsyncSession,
        updates: Dict[str, Any],
        actor_email: str,
        reason: Optional[str] = None
    ) -> Tuple[AlertEngineConfig, Optional[str], Optional[str]]:
        """Validates and persists updated AlertEngineConfig into SystemSetting with audit trail."""
        curr_cfg, _, _ = await cls.get_config(db)
        curr_dict = curr_cfg.model_dump()

        for k, v in updates.items():
            if v is not None and k in curr_dict:
                curr_dict[k] = v

        # Validate through Pydantic
        new_cfg = AlertEngineConfig(**curr_dict)

        stmt = select(SystemSetting).where(SystemSetting.key == ALERT_CONFIG_SETTING_KEY)
        res = await db.execute(stmt)
        setting = res.scalar_one_or_none()

        serialized = json.dumps(new_cfg.model_dump())
        if not setting:
            setting = SystemSetting(
                key=ALERT_CONFIG_SETTING_KEY,
                value=serialized,
                description="Centralized Alert Engine thresholds, cooldowns, and priority mapping",
                updated_by=actor_email
            )
            db.add(setting)
        else:
            old_val = setting.value
            setting.value = serialized
            setting.updated_by = actor_email

        await db.flush()

        await AuditService.log_action(
            db,
            actor_email=actor_email,
            actor_role="admin",
            action="ALERT_CONFIG_UPDATE",
            target_entity="AlertEngineConfig",
            target_id=ALERT_CONFIG_SETTING_KEY,
            diff_new=new_cfg.model_dump(),
            details="Updated Alert Engine configuration" + (f" (Reason: {reason})" if reason else "")
        )

        await db.commit()
        await db.refresh(setting)

        u_at = setting.updated_at.isoformat() if setting.updated_at else None
        return new_cfg, u_at, setting.updated_by
