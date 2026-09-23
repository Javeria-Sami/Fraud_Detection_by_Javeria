"""
Analytics & Visualization Schemas.
Section 18 — Analytics & Visualization.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AnalyticsFilterParams(BaseModel):
    """
    Global analytics filter parameters.
    """
    range: str = Field(default="30d", description="Preset: today, yesterday, 7d, 30d, 90d, this_month, previous_month, custom")
    date_from: Optional[str] = Field(None, description="ISO timestamp start boundary")
    date_to: Optional[str] = Field(None, description="ISO timestamp end boundary")
    currency: Optional[str] = Field(None, description="Currency filter, e.g. USD, EUR, PKR")
    status: Optional[str] = Field(None, description="Transaction status filter")
    risk_level: Optional[str] = Field(None, description="Risk level filter: LOW, MEDIUM, HIGH, CRITICAL")
    severity: Optional[str] = Field(None, description="Alert/Case severity filter: LOW, MEDIUM, HIGH, CRITICAL")
    merchant: Optional[str] = Field(None, description="Merchant name substring")
    device_id: Optional[str] = Field(None, description="Device ID filter")
    user_id: Optional[str] = Field(None, description="User ID filter")


# ---------------------------------------------------------------------------
# Summary / Overview
# ---------------------------------------------------------------------------

class CurrencyVolumeSummary(BaseModel):
    currency: str
    total_volume: float = 0.0
    flagged_volume: float = 0.0
    transaction_count: int = 0


class AnalyticsOverviewKPIs(BaseModel):
    total_transactions: int = 0
    total_volume_usd_equiv: float = 0.0
    currencies: List[CurrencyVolumeSummary] = []
    high_risk_transactions: int = 0
    critical_risk_transactions: int = 0
    suspicious_transactions: int = 0
    flagged_amount_usd_equiv: float = 0.0
    anomaly_count: int = 0
    anomaly_rate: float = 0.0
    active_alerts: int = 0
    critical_alerts: int = 0
    open_cases: int = 0
    high_risk_users: int = 0


class AnalyticsOverviewResponse(BaseModel):
    time_range: str
    date_from: str
    date_to: str
    generated_at: str
    kpis: AnalyticsOverviewKPIs


# ---------------------------------------------------------------------------
# Transaction Analytics
# ---------------------------------------------------------------------------

class TimeSeriesPoint(BaseModel):
    time: str
    timestamp: str
    transaction_count: int = 0
    flagged_count: int = 0
    total_volume: float = 0.0
    avg_amount: float = 0.0
    avg_risk_score: float = 0.0


class CategoryDistributionItem(BaseModel):
    category: str
    count: int = 0
    volume: float = 0.0
    percentage: float = 0.0


class StatusDistributionItem(BaseModel):
    status: str
    count: int = 0
    volume: float = 0.0
    percentage: float = 0.0


class PaymentMethodDistributionItem(BaseModel):
    payment_method: str
    count: int = 0
    volume: float = 0.0
    percentage: float = 0.0


class TransactionAnalyticsResponse(BaseModel):
    time_range: str
    date_from: str
    date_to: str
    total_transactions: int
    volume_trend: List[TimeSeriesPoint]
    status_distribution: List[StatusDistributionItem]
    category_distribution: List[CategoryDistributionItem]
    payment_method_distribution: List[PaymentMethodDistributionItem]
    currencies: List[CurrencyVolumeSummary]


# ---------------------------------------------------------------------------
# Risk Analytics
# ---------------------------------------------------------------------------

class RiskLevelDistributionItem(BaseModel):
    risk_level: str
    count: int = 0
    percentage: float = 0.0
    total_volume: float = 0.0


class RiskHistogramBucket(BaseModel):
    bucket: str
    min_score: float
    max_score: float
    count: int = 0
    percentage: float = 0.0


class RiskTrendPoint(BaseModel):
    time: str
    timestamp: str
    avg_risk_score: float = 0.0
    high_risk_count: int = 0
    critical_risk_count: int = 0


class RiskAnalyticsResponse(BaseModel):
    time_range: str
    date_from: str
    date_to: str
    total_scored_transactions: int
    average_risk_score: float = 0.0
    risk_level_distribution: List[RiskLevelDistributionItem]
    risk_histogram: List[RiskHistogramBucket]
    risk_trend: List[RiskTrendPoint]


# ---------------------------------------------------------------------------
# Alert Analytics
# ---------------------------------------------------------------------------

class AlertTrendPoint(BaseModel):
    time: str
    timestamp: str
    total_alerts: int = 0
    critical_alerts: int = 0
    resolved_alerts: int = 0


class AlertDistributionItem(BaseModel):
    label: str
    count: int = 0
    percentage: float = 0.0


class AlertResponseMetrics(BaseModel):
    total_resolved: int = 0
    avg_resolution_time_minutes: Optional[float] = None
    median_resolution_time_minutes: Optional[float] = None
    total_active: int = 0


class AlertAnalyticsResponse(BaseModel):
    time_range: str
    date_from: str
    date_to: str
    total_alerts: int
    active_alerts: int
    critical_alerts: int
    alert_trend: List[AlertTrendPoint]
    severity_distribution: List[AlertDistributionItem]
    status_distribution: List[AlertDistributionItem]
    top_alert_reasons: List[AlertDistributionItem]
    response_metrics: AlertResponseMetrics


# ---------------------------------------------------------------------------
# ML Anomaly Analytics
# ---------------------------------------------------------------------------

class AnomalyScoreBucket(BaseModel):
    bucket: str
    min_score: float
    max_score: float
    count: int = 0
    percentage: float = 0.0


class ModelVersionItem(BaseModel):
    model_version: str
    prediction_count: int = 0
    anomaly_count: int = 0
    avg_anomaly_score: float = 0.0
    anomaly_rate: float = 0.0


class MLAnomalyAnalyticsResponse(BaseModel):
    time_range: str
    date_from: str
    date_to: str
    total_predictions: int = 0
    anomaly_count: int = 0
    anomaly_rate: float = 0.0
    avg_anomaly_score: float = 0.0
    score_histogram: List[AnomalyScoreBucket]
    model_versions: List[ModelVersionItem]


# ---------------------------------------------------------------------------
# Rule Analytics
# ---------------------------------------------------------------------------

class RuleTriggerItem(BaseModel):
    rule_id: str
    rule_name: str
    category: str
    severity: str
    trigger_count: int = 0
    execution_count: int = 0
    trigger_rate: float = 0.0


class RuleAnalyticsResponse(BaseModel):
    time_range: str
    date_from: str
    date_to: str
    total_rules: int = 0
    total_executions: int = 0
    total_triggers: int = 0
    overall_trigger_rate: float = 0.0
    top_triggered_rules: List[RuleTriggerItem]


# ---------------------------------------------------------------------------
# Case Analytics
# ---------------------------------------------------------------------------

class CaseTrendPoint(BaseModel):
    time: str
    timestamp: str
    created_count: int = 0
    resolved_count: int = 0


class CaseDistributionItem(BaseModel):
    label: str
    count: int = 0
    percentage: float = 0.0


class AnalystWorkloadItem(BaseModel):
    analyst_name: str
    assigned_cases: int = 0
    open_cases: int = 0
    resolved_cases: int = 0


class CaseAnalyticsResponse(BaseModel):
    time_range: str
    date_from: str
    date_to: str
    total_cases: int = 0
    open_cases: int = 0
    investigating_cases: int = 0
    resolved_cases: int = 0
    closed_cases: int = 0
    case_trend: List[CaseTrendPoint]
    status_distribution: List[CaseDistributionItem]
    severity_distribution: List[CaseDistributionItem]
    resolution_distribution: List[CaseDistributionItem]
    analyst_workload: Optional[List[AnalystWorkloadItem]] = None


# ---------------------------------------------------------------------------
# Geographic & Entity Analytics
# ---------------------------------------------------------------------------

class CountryAnalyticsItem(BaseModel):
    country: str
    transaction_count: int = 0
    total_volume: float = 0.0
    high_risk_count: int = 0
    high_risk_percentage: float = 0.0


class CityAnalyticsItem(BaseModel):
    city: str
    country: str
    transaction_count: int = 0
    high_risk_count: int = 0


class GeographicAnalyticsResponse(BaseModel):
    time_range: str
    date_from: str
    date_to: str
    countries: List[CountryAnalyticsItem]
    cities: List[CityAnalyticsItem]


class MerchantRankingItem(BaseModel):
    merchant_name: str
    merchant_category: Optional[str] = None
    transaction_count: int = 0
    total_volume: float = 0.0
    high_risk_count: int = 0
    high_risk_rate: float = 0.0


class DeviceRankingItem(BaseModel):
    device_id: str
    distinct_users: int = 0
    transaction_count: int = 0
    avg_risk_score: float = 0.0
    is_shared: bool = False


class EntityPatternsResponse(BaseModel):
    time_range: str
    date_from: str
    date_to: str
    top_merchants: List[MerchantRankingItem]
    top_devices: List[DeviceRankingItem]
