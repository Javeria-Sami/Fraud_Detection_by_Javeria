export type RoleType = 'admin' | 'analyst' | 'viewer';

export interface User {
  id: string;
  email: string;
  username?: string;
  full_name: string;
  role: RoleType;
  permissions?: string[];
  is_active: boolean;
  is_verified?: boolean;
  created_at?: string;
  last_login_at?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface RiskFactor {
  factor_name: string;
  weight: number;
  score: number;
  contribution: number;
  description: string;
}

export interface TriggeredRule {
  rule_id: string;
  rule_name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  points: number;
  version: string;
  details?: Record<string, any>;
}

export interface Transaction {
  id: string;
  transaction_id?: string;
  user_id: string;
  user_name?: string;
  merchant_id?: string;
  merchant_name: string;
  merchant_category: string;
  payment_method: string;
  transaction_type?: string;
  amount: number;
  currency: string;
  device_id: string;
  ip_address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  failed_attempts: number;
  source: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ml_anomaly_score: number;
  rules_triggered: TriggeredRule[];
  risk_factors: RiskFactor[];
  status: 'APPROVED' | 'REVIEW_REQUIRED' | 'BLOCKED' | 'FLAGGED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'DECLINED' | 'REVERSED' | 'CANCELLED';
  timestamp: string;
  created_at: string;
}

export interface TransactionRiskDetail {
  score: number;
  risk_level: string;
  rule_score: number;
  ml_score: number;
  behavior_score: number;
  explanation: any[];
  scoring_version: string;
  created_at?: string;
}

export interface TransactionRuleSignal {
  rule_id: string;
  rule_name: string;
  category: string;
  severity: string;
  score: number;
  triggered: boolean;
  reason?: string;
  evidence?: Record<string, any>;
  version?: string;
}

export interface TransactionMLAnalysis {
  model_name: string;
  model_version: string;
  algorithm: string;
  anomaly_score: number;
  prediction: string;
  confidence: number;
  inference_time_ms: number;
  contextual_indicators: string[];
  created_at?: string;
}

export interface TransactionAlertSummary {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  alert_reason?: string;
  created_at?: string;
}

export interface TransactionInvestigationDetail {
  transaction: Transaction;
  risk?: TransactionRiskDetail | null;
  rules: TransactionRuleSignal[];
  ml_prediction?: TransactionMLAnalysis | null;
  features: Record<string, any>;
  feature_version: string;
  alerts: TransactionAlertSummary[];
  user_context?: {
    user_id: string;
    user_name?: string;
    baseline_spending: number;
    total_transactions: number;
    fraud_incident_count: number;
    active_risk_level: string;
  } | null;
}

export interface Alert {
  id: string;
  alert_id?: string;
  transaction_id: string;
  user_id?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  alert_reason: string;
  title?: string;
  description?: string;
  triggered_rules: any[];
  model_version?: string;
  status: 'NEW' | 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'DISMISSED' | 'ESCALATED';
  assigned_to?: string;
  case_id?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AlertStats {
  total_alerts: number;
  open_alerts: number;
  critical_alerts: number;
  high_priority_alerts: number;
  unassigned_alerts: number;
  escalated_alerts: number;
  resolved_today: number;
}

export interface AlertPaginatedResponse {
  items: Alert[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AlertLifecycleHistoryItem {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  diff_old?: Record<string, any>;
  diff_new?: Record<string, any>;
  details?: string;
  timestamp?: string;
}

export interface AlertInvestigationDetail {
  alert: Alert;
  transaction?: Record<string, any> | null;
  risk?: {
    risk_score: number;
    risk_level: string;
    rule_score: number;
    ml_score: number;
    behavior_score: number;
    explanation: any[];
    scoring_version: string;
    calculated_at?: string;
  } | null;
  rules: {
    rule_id: string;
    rule_name: string;
    category: string;
    severity: string;
    score: number;
    triggered: boolean;
    reason?: string;
    evidence?: any;
    version?: string;
  }[];
  ml_prediction?: {
    model_name: string;
    model_version: string;
    algorithm: string;
    anomaly_score: number;
    is_anomaly: boolean;
    threshold: number;
    inference_time_ms: number;
    contextual_indicators: string[];
    prediction_timestamp?: string;
  } | null;
  lifecycle_history: AlertLifecycleHistoryItem[];
}

export interface CaseNote {
  id: string;
  case_id: string;
  author: string;
  author_id?: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface CaseEvidence {
  id: string;
  case_id: string;
  title: string;
  description?: string;
  evidence_type: string;
  file_reference?: string;
  payload?: Record<string, any>;
  metadata_json?: Record<string, any>;
  uploaded_by: string;
  created_at?: string;
}

export interface CaseAlertItem {
  id: string;
  alert_id?: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  risk_score: number;
  alert_reason?: string;
  created_at?: string;
}

export interface CaseTransactionItem {
  id: string;
  amount: number;
  currency: string;
  merchant_name?: string;
  payment_method: string;
  risk_score: number;
  risk_level: string;
  status: string;
  timestamp?: string;
}

export interface CaseTimelineItem {
  id: string;
  case_id: string;
  action: string;
  from_status?: string;
  to_status?: string;
  note?: string;
  actor_id?: string;
  actor_name?: string;
  details?: Record<string, any>;
  created_at?: string;
}

export interface Case {
  id: string;
  case_id?: string;
  title: string;
  description?: string;
  user_id?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'PENDING' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  assigned_analyst?: string;
  assigned_to?: string;
  risk_score: number;
  related_transaction_ids: string[];
  related_alert_ids: string[];
  alerts_count?: number;
  transactions_count?: number;
  resolution?: string;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  closed_at?: string;
  created_at?: string;
  updated_at?: string;
  notes?: CaseNote[];
  evidence?: CaseEvidence[];
}

export interface CaseDetail extends Case {
  alerts: CaseAlertItem[];
  transactions: CaseTransactionItem[];
  notes: CaseNote[];
  evidence: CaseEvidence[];
  history: CaseTimelineItem[];
}

export interface CaseStats {
  total_cases: number;
  open_cases: number;
  investigating_cases: number;
  critical_cases: number;
  unassigned_cases: number;
  resolved_today: number;
}

export interface CasePaginatedResponse {
  items: Case[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ProfileSignalItem {
  code: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: string;
}

export interface UserRiskProfile {
  user_id: string;
  user_name?: string;
  profile_state: 'NEW_ENTITY' | 'LIMITED_HISTORY' | 'ESTABLISHED';
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  total_volume: number;
  avg_amount: number;
  median_amount: number;
  min_amount: number;
  max_amount: number;
  std_dev_amount: number;
  failure_rate: number;
  first_seen?: string;
  last_seen?: string;
  typical_hours: number[];
  habitual_hour_display?: string;
  top_locations: { city?: string; country?: string; count: number }[];
  distinct_devices_count: number;
  distinct_devices: string[];
  distinct_merchants_count: number;
  distinct_merchants: string[];
  contextual_signals: ProfileSignalItem[];
  risk_level: string;
  last_known_risk_score?: number;
  updated_at?: string;
}

export interface DeviceRiskProfile {
  device_id: string;
  profile_state: 'NEW_ENTITY' | 'LIMITED_HISTORY' | 'ESTABLISHED';
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  distinct_users_count: number;
  associated_users: string[];
  distinct_merchants_count: number;
  associated_merchants: string[];
  failure_rate: number;
  first_seen?: string;
  last_seen?: string;
  locations_used: { city?: string; country?: string; count: number }[];
  is_blacklisted?: string;
  risk_score?: number;
  contextual_signals: ProfileSignalItem[];
  updated_at?: string;
}

export interface MerchantRiskProfile {
  merchant_name: string;
  category: string;
  base_risk_tier: string;
  profile_state: 'NEW_ENTITY' | 'LIMITED_HISTORY' | 'ESTABLISHED';
  total_volume: number;
  total_transactions: number;
  avg_amount: number;
  median_amount: number;
  max_amount: number;
  successful_transactions: number;
  failed_transactions: number;
  failure_rate: number;
  distinct_users_count: number;
  distinct_devices_count: number;
  first_seen?: string;
  last_seen?: string;
  locations: { city?: string; country?: string; count: number }[];
  contextual_signals: ProfileSignalItem[];
  alert_count?: number;
  fraud_confirmed_count?: number;
  updated_at?: string;
}

export interface ProfileSummaryResponse {
  entity_type: string;
  entity_id: string;
  profile_state: string;
  total_transactions: number;
  total_volume: number;
  avg_amount: number;
  failure_rate: number;
  risk_indicator: string;
  key_context: string;
  signals_count: number;
  contextual_signals: ProfileSignalItem[];
  calculated_at: string;
}

export interface ProfileStatsResponse {
  total_user_profiles: number;
  high_risk_users: number;
  total_devices: number;
  shared_devices: number;
  total_merchants: number;
  high_risk_merchants: number;
}

export interface ProfileRecalculateResponse {
  status: string;
  recalculated_entities: Record<string, number>;
  timestamp: string;
}

export interface OverviewKPIs {
  total_transactions: number;
  transactions_today: number;
  suspicious_transactions: number;
  total_volume: number;
  flagged_amount: number;
  active_alerts: number;
  critical_alerts: number;
  open_cases: number;
  high_risk_users: number;
  risk_breakdown: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

export interface MLModel {
  id: string;
  name: string;
  version: string;
  algorithm: string;
  feature_version: string;
  status: 'CANDIDATE' | 'EVALUATED' | 'APPROVED' | 'STAGING' | 'PRODUCTION' | 'RETIRED';
  metrics: {
    precision?: number;
    recall?: number;
    f1_score?: number;
    roc_auc?: number;
    evaluated_samples?: number;
    evaluated_at?: string;
  };
  drift_metrics: {
    psi?: number;
    feature_drift_detected?: boolean;
    drift_score?: number;
    baseline_stability?: string;
  };
  artifact_path: string;
  description?: string;
  created_at?: string;
  deployed_at?: string;
  retired_at?: string;
}

export interface FraudRule {
  id: string;
  name: string;
  description?: string;
  category: string;
  weight: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority: number;
  is_active: boolean;
  condition_config: Record<string, any>;
  version: string;
  created_by: string;
  updated_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_entity: string;
  target_id: string;
  correlation_id?: string;
  ip_address?: string;
  status: string;
  diff_old?: Record<string, any>;
  diff_new?: Record<string, any>;
  details?: string;
  timestamp?: string;
}

export interface SystemSetting {
  key: string;
  value: any;
  description?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface EventEnvelope<T = any> {
  event_id: string;
  event_type: string;
  schema_version: string;
  occurred_at: string;
  source?: string;
  entity_type?: string;
  entity_id: string;
  severity?: string;
  correlation_id?: string;
  payload: T;
}

export type WebSocketEvent<T = any> = EventEnvelope<T>;

export interface TrendBucket {
  time: string;
  timestamp: string;
  transaction_count: number;
  flagged_count: number;
  total_volume: number;
  avg_risk_score: number;
}

export interface SubsystemStatus {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'ERROR' | 'UNKNOWN';
  message: string;
}

export interface SecurityDashboardKPIs {
  total_transactions: number;
  total_volume: number;
  high_risk_transactions: number;
  critical_transactions: number;
  suspicious_transactions: number;
  flagged_amount: number;
  anomaly_count: number;
  anomaly_rate: number;
  active_alerts: number;
  critical_alerts: number;
}

export interface SecurityDashboardData {
  time_range: '15m' | '1h' | '6h' | '24h' | '7d' | string;
  start_time: string;
  generated_at: string;
  kpis: SecurityDashboardKPIs;
  risk_distribution: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
  trends: TrendBucket[];
  recent_transactions: Transaction[];
  active_alerts: Alert[];
  system_status: SubsystemStatus[];
}

export interface LiveActivityItem {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  entityId?: string;
  riskScore?: number;
  severity?: string;
  details?: string;
}

// ---------------------------------------------------------------------------
// SECTION 17: Historical & Cross-Entity Search Types
// ---------------------------------------------------------------------------

export interface SearchQueryRequest {
  query?: string;
  entity_types?: ('transaction' | 'alert' | 'case' | 'user' | 'device' | 'merchant')[];
  date_from?: string;
  date_to?: string;
  risk_min?: number;
  risk_max?: number;
  risk_levels?: ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')[];
  statuses?: string[];
  severities?: string[];
  min_amount?: number;
  max_amount?: number;
  currency?: string;
  country?: string;
  city?: string;
  payment_methods?: string[];
  assigned_to?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'newest' | 'oldest' | 'risk_desc' | 'amount_desc' | 'relevance';
}

export interface TransactionSearchResult {
  id: string;
  timestamp: string;
  amount: number;
  currency: string;
  status: string;
  risk_score: number;
  risk_level: string;
  user_id: string;
  user_name?: string;
  merchant_id?: string;
  merchant_name?: string;
  device_id?: string;
  city?: string;
  country?: string;
  payment_method?: string;
  relevance_score?: number;
}

export interface AlertSearchResult {
  id: string;
  title: string;
  alert_reason?: string;
  severity: string;
  status: string;
  risk_score: number;
  transaction_id?: string;
  user_id?: string;
  assigned_to?: string;
  created_at: string;
  relevance_score?: number;
}

export interface CaseSearchResult {
  id: string;
  title: string;
  description?: string;
  status: string;
  severity: string;
  risk_score?: number;
  assigned_to?: string;
  user_id?: string;
  created_at: string;
  relevance_score?: number;
}

export interface UserSearchResult {
  user_id: string;
  full_name?: string;
  email?: string;
  risk_score: number;
  risk_level: string;
  total_transactions: number;
  flagged_transactions: number;
  last_active?: string;
  relevance_score?: number;
}

export interface DeviceSearchResult {
  device_id: string;
  risk_score: number;
  risk_level: string;
  distinct_users_count: number;
  total_transactions: number;
  last_seen?: string;
  relevance_score?: number;
}

export interface MerchantSearchResult {
  merchant_id: string;
  merchant_name: string;
  merchant_category?: string;
  risk_score: number;
  risk_level: string;
  total_transactions: number;
  failed_transactions: number;
  last_activity?: string;
  relevance_score?: number;
}

export interface EntityGroupResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SearchCountsByCategory {
  transactions: number;
  alerts: number;
  cases: number;
  users: number;
  devices: number;
  merchants: number;
  total: number;
}

export interface SearchResponse {
  query?: string;
  total_results?: number;
  execution_time_ms: number;
  counts?: SearchCountsByCategory;
  counts_by_category?: SearchCountsByCategory;
  transactions?: EntityGroupResult<TransactionSearchResult>;
  alerts?: EntityGroupResult<AlertSearchResult>;
  cases?: EntityGroupResult<CaseSearchResult>;
  users?: EntityGroupResult<UserSearchResult>;
  devices?: EntityGroupResult<DeviceSearchResult>;
  merchants?: EntityGroupResult<MerchantSearchResult>;
  page?: number;
  page_size?: number;
}

export interface AutocompleteSuggestion {
  id: string;
  entity_type: 'transaction' | 'alert' | 'case' | 'user' | 'device' | 'merchant';
  label: string;
  subtext?: string;
  score?: number;
}

// ---------------------------------------------------------------------------
// SECTION 18: Analytics & Visualization Types
// ---------------------------------------------------------------------------

export interface AnalyticsFilterParams {
  range?: string;
  date_from?: string;
  date_to?: string;
  currency?: string;
  status?: string;
  risk_level?: string;
  severity?: string;
  merchant?: string;
  device_id?: string;
  user_id?: string;
}

export interface CurrencyVolumeSummary {
  currency: string;
  total_volume: number;
  flagged_volume: number;
  transaction_count: number;
}

export interface AnalyticsOverviewKPIs {
  total_transactions: number;
  total_volume_usd_equiv: number;
  currencies: CurrencyVolumeSummary[];
  high_risk_transactions: number;
  critical_risk_transactions: number;
  suspicious_transactions: number;
  flagged_amount_usd_equiv: number;
  anomaly_count: number;
  anomaly_rate: number;
  active_alerts: number;
  critical_alerts: number;
  open_cases: number;
  high_risk_users: number;
}

export interface AnalyticsOverviewResponse {
  time_range: string;
  date_from: string;
  date_to: string;
  generated_at: string;
  kpis: AnalyticsOverviewKPIs;
}

export interface TimeSeriesPoint {
  time: string;
  timestamp: string;
  transaction_count: number;
  flagged_count: number;
  total_volume: number;
  avg_amount: number;
  avg_risk_score: number;
}

export interface CategoryDistributionItem {
  category: string;
  count: number;
  volume: number;
  percentage: number;
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  volume: number;
  percentage: number;
}

export interface PaymentMethodDistributionItem {
  payment_method: string;
  count: number;
  volume: number;
  percentage: number;
}

export interface TransactionAnalyticsResponse {
  time_range: string;
  date_from: string;
  date_to: string;
  total_transactions: number;
  volume_trend: TimeSeriesPoint[];
  status_distribution: StatusDistributionItem[];
  category_distribution: CategoryDistributionItem[];
  payment_method_distribution: PaymentMethodDistributionItem[];
  currencies: CurrencyVolumeSummary[];
}

export interface RiskLevelDistributionItem {
  risk_level: string;
  count: number;
  percentage: number;
  total_volume: number;
}

export interface RiskHistogramBucket {
  bucket: string;
  min_score: number;
  max_score: number;
  count: number;
  percentage: number;
}

export interface RiskTrendPoint {
  time: string;
  timestamp: string;
  avg_risk_score: number;
  high_risk_count: number;
  critical_risk_count: number;
}

export interface RiskAnalyticsResponse {
  time_range: string;
  date_from: string;
  date_to: string;
  total_scored_transactions: number;
  average_risk_score: number;
  risk_level_distribution: RiskLevelDistributionItem[];
  risk_histogram: RiskHistogramBucket[];
  risk_trend: RiskTrendPoint[];
}

export interface AlertTrendPoint {
  time: string;
  timestamp: string;
  total_alerts: number;
  critical_alerts: number;
  resolved_alerts: number;
}

export interface AlertDistributionItem {
  label: string;
  count: number;
  percentage: number;
}

export interface AlertResponseMetrics {
  total_resolved: number;
  avg_resolution_time_minutes?: number;
  median_resolution_time_minutes?: number;
  total_active: number;
}

export interface AlertAnalyticsResponse {
  time_range: string;
  date_from: string;
  date_to: string;
  total_alerts: number;
  active_alerts: number;
  critical_alerts: number;
  alert_trend: AlertTrendPoint[];
  severity_distribution: AlertDistributionItem[];
  status_distribution: AlertDistributionItem[];
  top_alert_reasons: AlertDistributionItem[];
  response_metrics: AlertResponseMetrics;
}

export interface AnomalyScoreBucket {
  bucket: string;
  min_score: number;
  max_score: number;
  count: number;
  percentage: number;
}

export interface ModelVersionItem {
  model_version: string;
  prediction_count: number;
  anomaly_count: number;
  avg_anomaly_score: number;
  anomaly_rate: number;
}

export interface MLAnomalyAnalyticsResponse {
  time_range: string;
  date_from: string;
  date_to: string;
  total_predictions: number;
  anomaly_count: number;
  anomaly_rate: number;
  avg_anomaly_score: number;
  score_histogram: AnomalyScoreBucket[];
  model_versions: ModelVersionItem[];
}

export interface RuleTriggerItem {
  rule_id: string;
  rule_name: string;
  category: string;
  severity: string;
  trigger_count: number;
  execution_count: number;
  trigger_rate: number;
}

export interface RuleAnalyticsResponse {
  time_range: string;
  date_from: string;
  date_to: string;
  total_rules: number;
  total_executions: number;
  total_triggers: number;
  overall_trigger_rate: number;
  top_triggered_rules: RuleTriggerItem[];
}

export interface CaseTrendPoint {
  time: string;
  timestamp: string;
  created_count: number;
  resolved_count: number;
}

export interface CaseDistributionItem {
  label: string;
  count: number;
  percentage: number;
}

export interface AnalystWorkloadItem {
  analyst_name: string;
  assigned_cases: number;
  open_cases: number;
  resolved_cases: number;
}

export interface CaseAnalyticsResponse {
  time_range: string;
  date_from: string;
  date_to: string;
  total_cases: number;
  open_cases: number;
  investigating_cases: number;
  resolved_cases: number;
  closed_cases: number;
  case_trend: CaseTrendPoint[];
  status_distribution: CaseDistributionItem[];
  severity_distribution: CaseDistributionItem[];
  resolution_distribution: CaseDistributionItem[];
  analyst_workload?: AnalystWorkloadItem[];
}

export interface CountryAnalyticsItem {
  country: string;
  transaction_count: number;
  total_volume: number;
  high_risk_count: number;
  high_risk_percentage: number;
}

export interface CityAnalyticsItem {
  city: string;
  country: string;
  transaction_count: number;
  high_risk_count: number;
}

export interface GeographicAnalyticsResponse {
  time_range: string;
  date_from: string;
  date_to: string;
  countries: CountryAnalyticsItem[];
  cities: CityAnalyticsItem[];
}

export interface MerchantRankingItem {
  merchant_name: string;
  merchant_category?: string;
  transaction_count: number;
  total_volume: number;
  high_risk_count: number;
  high_risk_rate: number;
}

export interface DeviceRankingItem {
  device_id: string;
  distinct_users: number;
  transaction_count: number;
  avg_risk_score: number;
  is_shared: boolean;
}

export interface EntityPatternsResponse {
  time_range: string;
  date_from: string;
  date_to: string;
  top_merchants: MerchantRankingItem[];
  top_devices: DeviceRankingItem[];
}

// ---------------------------------------------------------------------------
// SECTION 19: Configurable Alerts & Rule Administration Types
// ---------------------------------------------------------------------------

export interface RuleVersion {
  id: string;
  rule_id: string;
  version: string;
  configuration: Record<string, any>;
  threshold?: number;
  weight: number;
  is_active: boolean;
  created_by: string;
  created_at?: string;
}

export interface AdminFraudRule {
  id: string;
  rule_code: string;
  name: string;
  description?: string;
  category: string;
  weight: number;
  severity: string;
  priority: number;
  is_active: boolean;
  condition_config: Record<string, any>;
  version: string;
  active_version_id?: string;
  total_executions: number;
  total_triggers: number;
  trigger_rate: number;
  created_by: string;
  updated_by: string;
  created_at?: string;
  updated_at?: string;
  versions?: RuleVersion[];
}

export interface RuleConfigValidationResult {
  valid: boolean;
  rule_code: string;
  cleaned_configuration: Record<string, any>;
  errors: string[];
  warnings: string[];
  required_features: string[];
}

export interface ConfigFieldDiffItem {
  field: string;
  value_a: any;
  value_b: any;
  changed: boolean;
}

export interface RuleVersionComparisonResult {
  rule_id: string;
  rule_code: string;
  version_a: string;
  version_b: string;
  weight_a: number;
  weight_b: number;
  is_active_a: boolean;
  is_active_b: boolean;
  created_at_a?: string;
  created_at_b?: string;
  configuration_diff: ConfigFieldDiffItem[];
}

export interface RuleSimulationResult {
  rule_code: string;
  triggered: boolean;
  score: number;
  severity: string;
  explanation: string;
  matched_features: Record<string, any>;
  configured_thresholds: Record<string, any>;
  execution_time_ms: number;
  simulated_at: string;
  is_simulation: boolean;
}

export interface RuleExecutionItem {
  id: string;
  transaction_id: string;
  rule_id: string;
  rule_version_id?: string;
  triggered: boolean;
  score: number;
  reason?: string;
  execution_time_ms: number;
  points_awarded?: number;
  execution_detail?: Record<string, any>;
  created_at?: string;
}

export interface RuleExecutionListResult {
  total: number;
  rule_id: string;
  items: RuleExecutionItem[];
}

export interface AlertEngineConfigData {
  alert_config_version: string;
  high_risk_threshold: number;
  critical_risk_threshold: number;
  ml_anomaly_threshold: number;
  cooldown_seconds: number;
  enable_cooldown: boolean;
  enable_critical_cooldown_override: boolean;
  enabled_alert_types: string[];
  severity_priority_map: Record<string, string>;
  updated_at?: string;
  updated_by?: string;
}

// ==========================================
// SECTION 20: ML MONITORING & MLOPS TYPES
// ==========================================

export type ModelHealthType = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

export interface MLMonitoringConfig {
  feature_drift_psi_warning: number;
  feature_drift_psi_critical: number;
  ks_p_value_threshold: number;
  prediction_score_drift_psi_warning: number;
  anomaly_rate_shift_warning: number;
  latency_p95_warning_ms: number;
  latency_p95_critical_ms: number;
  error_rate_warning_threshold: number;
  error_rate_critical_threshold: number;
  missing_feature_rate_warning: number;
  invalid_feature_rate_warning: number;
  minimum_sample_size: number;
  default_monitoring_window_hours: number;
  default_reference_window_days: number;
  max_monitoring_range_days: number;
  updated_at?: string;
  updated_by?: string;
}

export interface MetricSnapshotItem {
  id?: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  threshold?: number;
  status: string;
  calculated_at?: string;
}

export interface FeatureDriftItem {
  id?: string;
  feature_name: string;
  feature_version: string;
  drift_method: string;
  drift_value: number;
  threshold: number;
  status: string;
  reference_mean?: number;
  current_mean?: number;
  reference_std?: number;
  current_std?: number;
  reference_null_rate?: number;
  current_null_rate?: number;
  calculated_at?: string;
}

export interface FeatureDriftMatrix {
  monitoring_run_id: string;
  model_version_id: string;
  feature_version: string;
  features_monitored: number;
  drift_detected_count: number;
  warning_count: number;
  critical_count: number;
  drift_results: FeatureDriftItem[];
}

export interface ModelHealthSummary {
  health_status: ModelHealthType;
  health_reasons: string[];
  model_id: string;
  model_name: string;
  model_version: string;
  feature_version: string;
  last_monitoring_run?: string;
  monitoring_window: {
    start: string;
    end: string;
  };
  sample_size: number;
  metrics: {
    prediction_volume: number;
    anomaly_volume: number;
    anomaly_rate: number;
    average_score: number;
    median_score: number;
    min_score: number;
    max_score: number;
    p10_score?: number;
    p25_score?: number;
    p75_score?: number;
    p90_score?: number;
    p95_score?: number;
    p99_score?: number;
    invalid_predictions_count: number;
    latency_avg_ms: number;
    latency_p50_ms: number;
    latency_p95_ms: number;
    latency_p99_ms: number;
    latency_max_ms: number;
    failure_rate: number;
    throughput_per_sec: number;
  };
  data_quality: {
    total_records: number;
    features_monitored: number;
    missing_rates: Record<string, number>;
    nan_counts: Record<string, number>;
    inf_counts: Record<string, number>;
    out_of_bounds_counts: Record<string, number>;
    freshness_lag_seconds: number;
    data_freshness_status: string;
    has_schema_issues: boolean;
  };
  drift_summary: {
    features_monitored: number;
    drifted_features_count: number;
    warning_count: number;
    critical_count: number;
    prediction_score_drift_psi: number;
  };
  ground_truth_performance: {
    available: boolean;
    reason?: string;
    sample_size?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    pr_auc?: number;
    roc_auc?: number;
    confusion_matrix?: {
      true_positive: number;
      false_positive: number;
      true_negative: number;
      false_negative: number;
    };
  };
  warnings: string[];
}

export interface MonitoringRunItem {
  id: string;
  model_version_id: string;
  feature_version: string;
  reference_window_start: string;
  reference_window_end: string;
  monitoring_window_start: string;
  monitoring_window_end: string;
  started_at: string;
  completed_at?: string;
  status: 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  records_evaluated: number;
  duration_ms?: number;
  error_message?: string;
  created_at?: string;
  model_version?: string;
}

export interface MonitoringRunDetail {
  run: MonitoringRunItem;
  metrics: MetricSnapshotItem[];
  drift_results: FeatureDriftItem[];
  health_status?: {
    health_status: ModelHealthType;
    reason?: string;
    calculated_at?: string;
  };
}

export interface MLMonitoredModel {
  id: string;
  name: string;
  version: string;
  algorithm: string;
  status: string;
  feature_version: string;
  created_at?: string;
  deployed_at?: string;
  health_status: ModelHealthType;
  last_run_at?: string;
  total_runs: number;
}

// ==========================================
// SECTION 21: MODEL RETRAINING TYPES
// ==========================================

export type RetrainingStatusType =
  | 'QUEUED'
  | 'RUNNING'
  | 'VALIDATING_DATA'
  | 'FEATURE_ENGINEERING'
  | 'TRAINING'
  | 'EVALUATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface RetrainingRunItem {
  id: string;
  model_type: string;
  base_model_version_id?: string;
  candidate_model_version_id?: string;
  candidate_version?: string;
  feature_version: string;
  dataset_reference?: string;
  training_window_start?: string;
  training_window_end?: string;
  status: RetrainingStatusType;
  records_used: number;
  started_at: string;
  completed_at?: string;
  duration_ms: number;
  error_message?: string;
  evaluation_report: Record<string, any>;
  model_comparison: Record<string, any>;
  data_quality_summary: Record<string, any>;
  artifact_checksum?: string;
  created_by?: string;
  created_at?: string;
}

export interface RetrainingRunListResponse {
  total: number;
  runs: RetrainingRunItem[];
}

export interface StartRetrainingParams {
  custom_version?: string;
  model_type?: string;
  n_estimators?: number;
  contamination?: number;
  random_state?: number;
  train_ratio?: number;
  val_ratio?: number;
  test_ratio?: number;
  min_samples?: number;
  threshold_method?: string;
  fixed_threshold?: number;
  target_feature_version?: string;
  training_window_start?: string;
  training_window_end?: string;
}

export interface MLRetrainingConfig {
  default_model_type: string;
  default_n_estimators: number;
  default_contamination: number;
  default_random_state: number;
  default_train_ratio: number;
  default_val_ratio: number;
  default_test_ratio: number;
  minimum_training_samples: number;
  maximum_training_samples: number;
  default_threshold_method: string;
  default_fixed_threshold: number;
  auto_evaluate_candidate: boolean;
  target_feature_version: string;
  updated_at?: string;
  updated_by?: string;
}

// ==========================================
// SECTION 22: ADMIN PANEL TYPES
// ==========================================

export interface PlatformComponentStatus {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';
  latency_ms?: number | null;
  details?: string | null;
  last_checked: string;
}

export interface PlatformStatusResponse {
  overall_status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  components: PlatformComponentStatus[];
  environment: string;
  generated_at: string;
}

export interface PlatformSummary {
  overall_status: string;
  database_status: string;
  api_status: string;
  ml_service_status: string;
  rule_engine_status: string;
  alert_engine_status: string;
  realtime_event_status: string;
}

export interface UserSummary {
  total_users: number;
  active_users: number;
  inactive_users: number;
  admin_count: number;
  analyst_count: number;
  viewer_count: number;
}

export interface DetectionSummary {
  active_fraud_rules: number;
  total_fraud_rules: number;
  active_alert_configs: number;
  recent_rule_changes: number;
}

export interface MLSummary {
  deployed_model_version: string;
  model_type: string;
  model_health: string;
  last_monitoring_run?: string | null;
  latest_retraining_run?: string | null;
  total_model_versions: number;
}

export interface SystemInfo {
  environment: string;
  application_name: string;
  backend_version: string;
  frontend_version: string;
  database_version: string;
}

export interface AdminOverviewResponse {
  platform: PlatformSummary;
  users: UserSummary;
  detection: DetectionSummary;
  ml: MLSummary;
  system: SystemInfo;
  generated_at: string;
}

export interface AdminUserListItem {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  last_login_at?: string | null;
}

export interface AdminUserListResponse {
  total: number;
  page: number;
  page_size: number;
  users: AdminUserListItem[];
}

export interface AdminUserAuditActivity {
  id: string;
  action: string;
  target_entity: string;
  target_id?: string | null;
  timestamp: string;
  details?: string | null;
}

export interface AdminUserDetailResponse {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  role_description?: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  last_login_at?: string | null;
  effective_permissions: string[];
  is_customer: boolean;
  customer_risk_score?: number | null;
  customer_risk_tier?: string | null;
  recent_activity: AdminUserAuditActivity[];
}

export interface UserStatusUpdateRequest {
  is_active: boolean;
  reason?: string;
}

export interface UserRoleUpdateRequest {
  role: string;
  reason?: string;
}

export interface AdminUserCreateRequest {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role?: string;
  is_active?: boolean;
}

export interface PermissionItem {
  id: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface RoleDetailResponse {
  id: string;
  name: string;
  description?: string | null;
  user_count: number;
  permission_count: number;
  permissions: string[];
}

export interface RolePermissionMatrixEntry {
  permission_name: string;
  permission_description?: string | null;
  category: string;
  granted_roles: Record<string, boolean>;
}

export interface PermissionMatrixResponse {
  roles: string[];
  matrix: RolePermissionMatrixEntry[];
}

export interface AdminSettingItem {
  key: string;
  category: string;
  type: string;
  value: any;
  default_value: any;
  description: string;
  is_sensitive: boolean;
  allowed_values?: string[] | null;
  min_value?: number | null;
  max_value?: number | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

export interface AdminSettingsListResponse {
  categories: string[];
  settings: AdminSettingItem[];
}

export interface AdminSettingUpdateRequest {
  value: any;
  reason?: string;
}

// ==========================================
// SECTION 23: AUDIT LOGGING TYPES
// ==========================================

export interface AuditLog {
  id: string;
  actor_user_id?: string | null;
  actor_email: string;
  actor_role: string;
  actor_type?: string;
  action: string;
  target_entity: string;
  resource_type: string;
  target_id: string;
  resource_id: string;
  status: string;
  outcome: string;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  source: string;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  correlation_id?: string | null;
  session_id?: string | null;
  diff_old?: Record<string, any> | null;
  diff_new?: Record<string, any> | null;
  details?: string | null;
  error_message?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string | null;
  timestamp?: string | null;
}

export interface AuditLogListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: AuditLog[];
}

export interface AuditStatsResponse {
  total_events: number;
  events_today: number;
  high_critical_count: number;
  failed_denied_count: number;
  admin_actions_count: number;
  action_breakdown: Record<string, number>;
  severity_breakdown: Record<string, number>;
  outcome_breakdown: Record<string, number>;
  generated_at: string;
}

export interface AuditLogFilterParams {
  query?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  actor_email?: string;
  actor_role?: string;
  actor_type?: string;
  severity?: string;
  outcome?: string;
  source?: string;
  request_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}

// ---------------------------------------------------------------------------
// SECTION 24 — NOTIFICATION SYSTEM TYPES
// ---------------------------------------------------------------------------

export type NotificationSeverityType = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
export type NotificationPriorityType = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationCategoryType = 'SECURITY_ALERTS' | 'CASE_UPDATES' | 'MODEL_MONITORING' | 'ADMIN_SYSTEM';
export type NotificationChannelType = 'IN_APP' | 'EMAIL' | 'WEBHOOK';

export interface NotificationDeliveryItem {
  id: string;
  channel: string;
  status: string;
  attempt_count: number;
  last_attempt_at: string;
  delivered_at?: string;
  failure_reason?: string;
  provider_reference?: string;
}

export interface NotificationItem {
  id: string;
  recipient_user_id: string;
  notification_type: string;
  category: NotificationCategoryType;
  title: string;
  message: string;
  severity: NotificationSeverityType;
  priority: NotificationPriorityType;
  source_type?: string;
  source_id?: string;
  delivery_status: string;
  read_at?: string | null;
  dismissed_at?: string | null;
  expires_at?: string | null;
  metadata_json?: Record<string, any>;
  created_at: string;
  updated_at: string;
  deliveries?: NotificationDeliveryItem[];
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
}

export interface UnreadCountResponse {
  unread_count: number;
  critical_count: number;
  high_count: number;
}

export interface NotificationPreferenceItem {
  category: string;
  channel: string;
  enabled: boolean;
  is_mandatory: boolean;
  label?: string;
  description?: string;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferenceItem[];
}

export interface NotificationFilterParams {
  unread_only?: boolean;
  category?: string;
  severity?: string;
  priority?: string;
  search?: string;
  page?: number;
  page_size?: number;
}



