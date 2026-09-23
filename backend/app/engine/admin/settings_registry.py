"""
Centralized Typed Settings Registry and Validation for Admin Panel.
Section 22 — Admin Panel.
"""
from typing import Dict, Any, List, Optional, Tuple
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.models.audit_log import SystemSetting


class SettingDefinition:
    def __init__(
        self,
        key: str,
        category: str,
        setting_type: str,
        default_value: Any,
        description: str,
        is_sensitive: bool = False,
        allowed_values: Optional[List[str]] = None,
        min_value: Optional[float] = None,
        max_value: Optional[float] = None,
    ):
        self.key = key
        self.category = category
        self.setting_type = setting_type
        self.default_value = default_value
        self.description = description
        self.is_sensitive = is_sensitive
        self.allowed_values = allowed_values
        self.min_value = min_value
        self.max_value = max_value

    def validate_value(self, val: Any) -> Tuple[bool, Any, Optional[str]]:
        """Validates incoming value against definition rules."""
        if val is None:
            return False, None, "Value cannot be null"

        if self.setting_type == "boolean":
            if isinstance(val, bool):
                return True, val, None
            if isinstance(val, str) and val.lower() in ("true", "1", "yes"):
                return True, True, None
            if isinstance(val, str) and val.lower() in ("false", "0", "no"):
                return True, False, None
            return False, None, "Value must be a boolean (true/false)"

        elif self.setting_type == "integer":
            try:
                num = int(val)
            except (ValueError, TypeError):
                return False, None, "Value must be a valid integer"
            if self.min_value is not None and num < self.min_value:
                return False, None, f"Value must be >= {self.min_value}"
            if self.max_value is not None and num > self.max_value:
                return False, None, f"Value must be <= {self.max_value}"
            return True, num, None

        elif self.setting_type == "float":
            try:
                num = float(val)
            except (ValueError, TypeError):
                return False, None, "Value must be a valid number"
            if self.min_value is not None and num < self.min_value:
                return False, None, f"Value must be >= {self.min_value}"
            if self.max_value is not None and num > self.max_value:
                return False, None, f"Value must be <= {self.max_value}"
            return True, num, None

        elif self.setting_type == "enum":
            str_val = str(val).strip()
            if self.allowed_values and str_val not in self.allowed_values:
                return False, None, f"Value must be one of: {', '.join(self.allowed_values)}"
            return True, str_val, None

        elif self.setting_type == "json":
            if isinstance(val, (dict, list)):
                return True, val, None
            if isinstance(val, str):
                try:
                    parsed = json.loads(val)
                    return True, parsed, None
                except json.JSONDecodeError:
                    return False, None, "Value must be valid JSON"
            return False, None, "Value must be a JSON object or string"

        else:  # string
            str_val = str(val).strip()
            if not str_val:
                return False, None, "String value cannot be empty"
            return True, str_val, None


# System Setting Registry Definitions
SETTINGS_REGISTRY: Dict[str, SettingDefinition] = {
    # GENERAL
    "system_mode": SettingDefinition(
        key="system_mode",
        category="GENERAL",
        setting_type="enum",
        default_value="ACTIVE_DEFENSE",
        description="Operational mode of the fraud defense engine",
        allowed_values=["ACTIVE_DEFENSE", "MONITOR_ONLY", "SIMULATION_ONLY"],
    ),
    "app_name": SettingDefinition(
        key="app_name",
        category="GENERAL",
        setting_type="string",
        default_value="FraudShield AI",
        description="Platform display brand name",
    ),
    "environment_name": SettingDefinition(
        key="environment_name",
        category="GENERAL",
        setting_type="enum",
        default_value="DEVELOPMENT",
        description="Platform runtime environment designation",
        allowed_values=["DEVELOPMENT", "STAGING", "PRODUCTION"],
    ),

    # TRANSACTION
    "max_transaction_amount": SettingDefinition(
        key="max_transaction_amount",
        category="TRANSACTION",
        setting_type="float",
        default_value=100000.0,
        description="Maximum single transaction ceiling in USD",
        min_value=100.0,
        max_value=10000000.0,
    ),
    "daily_velocity_threshold": SettingDefinition(
        key="daily_velocity_threshold",
        category="TRANSACTION",
        setting_type="integer",
        default_value=50,
        description="Maximum transaction count allowed per cardholder in 24 hours",
        min_value=1,
        max_value=1000,
    ),
    "enforce_strict_currency_validation": SettingDefinition(
        key="enforce_strict_currency_validation",
        category="TRANSACTION",
        setting_type="boolean",
        default_value=True,
        description="Strictly reject unlisted currency symbols upon ingestion",
    ),

    # RISK
    "risk_threshold_low": SettingDefinition(
        key="risk_threshold_low",
        category="RISK",
        setting_type="integer",
        default_value=30,
        description="Maximum score threshold for LOW risk tier (0-30)",
        min_value=0,
        max_value=50,
    ),
    "risk_threshold_medium": SettingDefinition(
        key="risk_threshold_medium",
        category="RISK",
        setting_type="integer",
        default_value=70,
        description="Score threshold for MEDIUM risk tier (31-70)",
        min_value=31,
        max_value=85,
    ),
    "risk_threshold_high": SettingDefinition(
        key="risk_threshold_high",
        category="RISK",
        setting_type="integer",
        default_value=90,
        description="Score threshold for HIGH risk tier (71-90)",
        min_value=71,
        max_value=95,
    ),
    "auto_block_threshold": SettingDefinition(
        key="auto_block_threshold",
        category="RISK",
        setting_type="integer",
        default_value=95,
        description="Risk score above which transactions are automatically blocked",
        min_value=80,
        max_value=100,
    ),

    # DETECTION
    "alert_cooldown_seconds": SettingDefinition(
        key="alert_cooldown_seconds",
        category="DETECTION",
        setting_type="integer",
        default_value=300,
        description="Cooldown window in seconds to suppress duplicate alert storms",
        min_value=10,
        max_value=3600,
    ),
    "enable_realtime_simulation": SettingDefinition(
        key="enable_realtime_simulation",
        category="DETECTION",
        setting_type="boolean",
        default_value=True,
        description="Enable zero-side-effect simulation testing for fraud rules",
    ),

    # ML
    "ml_anomaly_threshold": SettingDefinition(
        key="ml_anomaly_threshold",
        category="ML",
        setting_type="float",
        default_value=0.65,
        description="Anomaly score threshold for ML detection engine alerts",
        min_value=0.1,
        max_value=1.0,
    ),
    "ml_drift_alert_threshold": SettingDefinition(
        key="ml_drift_alert_threshold",
        category="ML",
        setting_type="float",
        default_value=0.15,
        description="PSI or Kolmogorov-Smirnov drift threshold triggering alerts",
        min_value=0.01,
        max_value=0.5,
    ),

    # SECURITY
    "session_timeout_minutes": SettingDefinition(
        key="session_timeout_minutes",
        category="SECURITY",
        setting_type="integer",
        default_value=60,
        description="Inactivity timeout in minutes for user sessions",
        min_value=5,
        max_value=1440,
    ),
    "max_failed_login_attempts": SettingDefinition(
        key="max_failed_login_attempts",
        category="SECURITY",
        setting_type="integer",
        default_value=5,
        description="Maximum failed login attempts before account lock",
        min_value=3,
        max_value=20,
    ),
    "audit_retention_days": SettingDefinition(
        key="audit_retention_days",
        category="SECURITY",
        setting_type="integer",
        default_value=365,
        description="Immutable audit log retention period in days",
        min_value=30,
        max_value=3650,
    ),
    "webhook_signing_secret": SettingDefinition(
        key="webhook_signing_secret",
        category="SECURITY",
        setting_type="string",
        default_value="configured-secret-key",
        description="HMAC secret for outbound SIEM webhooks",
        is_sensitive=True,
    ),
}


class AdminSettingsService:
    @staticmethod
    async def get_all_settings(db: AsyncSession) -> List[Dict[str, Any]]:
        """Fetches all registered settings merged with database overrides, applying secret masking."""
        stmt = select(SystemSetting)
        res = await db.execute(stmt)
        db_settings = {s.key: s for s in res.scalars().all()}

        output = []
        for key, defn in SETTINGS_REGISTRY.items():
            db_row = db_settings.get(key)
            val = db_row.value if db_row else defn.default_value
            updated_by = db_row.updated_by if db_row else "system"
            updated_at = db_row.updated_at.isoformat() if db_row and db_row.updated_at else None

            # Mask sensitive values
            display_val = "••••••••••••" if defn.is_sensitive and val else val
            if defn.is_sensitive and not val:
                display_val = "Not Configured"

            output.append({
                "key": defn.key,
                "category": defn.category,
                "type": defn.setting_type,
                "value": display_val,
                "default_value": "••••••••••••" if defn.is_sensitive else defn.default_value,
                "description": db_row.description if db_row and db_row.description else defn.description,
                "is_sensitive": defn.is_sensitive,
                "allowed_values": defn.allowed_values,
                "min_value": defn.min_value,
                "max_value": defn.max_value,
                "updated_by": updated_by,
                "updated_at": updated_at,
            })
        return output

    @staticmethod
    def get_categories() -> List[str]:
        return ["GENERAL", "TRANSACTION", "RISK", "DETECTION", "ML", "SECURITY"]
