"""
Domain Database Models Central Registry.
"""
from backend.app.core.database import Base, utc_now
from backend.app.models.user import User, Role, Permission, role_permissions
from backend.app.models.merchant import Merchant
from backend.app.models.device import Device
from backend.app.models.transaction import Transaction, TransactionStatus, FeatureSnapshot
from backend.app.models.rule import FraudRule, FraudRuleVersion, RuleExecution
from backend.app.models.ml_model import (
    MLModelRegistry,
    ModelVersion,
    MLPrediction,
    ModelMonitoringRun,
    ModelMetricSnapshot,
    FeatureDriftResult,
    ModelHealthStatus,
    ModelRetrainingRun
)
from backend.app.models.risk_score import RiskScore
from backend.app.models.alert import Alert, AlertSeverity, AlertStatus
from backend.app.models.case import (
    Case,
    CaseSeverity,
    CasePriority,
    CaseStatus,
    CaseNote,
    CaseEvidence,
    CaseHistory,
    case_alerts,
    case_transactions
)
from backend.app.models.risk_profile import UserRiskProfile, DeviceRiskProfile, MerchantRiskProfile
from backend.app.models.audit_log import AuditLog, SystemSetting
from backend.app.models.notification import (
    Notification,
    NotificationPreference,
    NotificationDelivery,
    NotificationType,
    NotificationCategory,
    NotificationChannelType,
    NotificationSeverity,
    NotificationPriority,
    NotificationStatus,
    DeliveryStatus
)

__all__ = [
    "Base",
    "User",
    "Role",
    "Permission",
    "role_permissions",
    "Merchant",
    "Device",
    "Transaction",
    "TransactionStatus",
    "FeatureSnapshot",
    "FraudRule",
    "FraudRuleVersion",
    "RuleExecution",
    "MLModelRegistry",
    "ModelVersion",
    "MLPrediction",
    "ModelMonitoringRun",
    "ModelMetricSnapshot",
    "FeatureDriftResult",
    "ModelHealthStatus",
    "ModelRetrainingRun",
    "RiskScore",
    "Alert",
    "AlertSeverity",
    "AlertStatus",
    "Case",
    "CaseSeverity",
    "CasePriority",
    "CaseStatus",
    "CaseNote",
    "CaseEvidence",
    "CaseHistory",
    "case_alerts",
    "case_transactions",
    "UserRiskProfile",
    "DeviceRiskProfile",
    "MerchantRiskProfile",
    "AuditLog",
    "SystemSetting",
    "Notification",
    "NotificationPreference",
    "NotificationDelivery",
    "NotificationType",
    "NotificationCategory",
    "NotificationChannelType",
    "NotificationSeverity",
    "NotificationPriority",
    "NotificationStatus",
    "DeliveryStatus"
]

