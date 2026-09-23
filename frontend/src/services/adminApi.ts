import { apiClient } from './api';
import {
  AdminFraudRule,
  RuleVersion,
  RuleConfigValidationResult,
  RuleVersionComparisonResult,
  RuleSimulationResult,
  RuleExecutionListResult,
  AlertEngineConfigData,
} from '../types';

export interface ListRulesFilterParams {
  search?: string;
  category?: string;
  severity?: string;
  is_active?: boolean;
}

export interface CreateRuleVersionPayload {
  version: string;
  configuration: Record<string, any>;
  threshold?: number;
  weight: number;
  is_active: boolean;
  reason?: string;
}

export interface UpdateRulePayload {
  name?: string;
  description?: string;
  category?: string;
  weight?: number;
  severity?: string;
  priority?: number;
  is_active?: boolean;
  condition_config?: Record<string, any>;
  version?: string;
  reason?: string;
}

export interface SimulateRulePayload {
  rule_code?: string;
  configuration?: Record<string, any>;
  weight?: number;
  severity?: string;
  transaction_data?: Record<string, any>;
  feature_overrides?: Record<string, any>;
}

export interface UpdateAlertConfigPayload {
  high_risk_threshold?: number;
  critical_risk_threshold?: number;
  ml_anomaly_threshold?: number;
  cooldown_seconds?: number;
  enable_cooldown?: boolean;
  enable_critical_cooldown_override?: boolean;
  enabled_alert_types?: string[];
  severity_priority_map?: Record<string, string>;
  reason?: string;
}

export const adminApi = {
  // Fraud Rules
  listRules: async (params?: ListRulesFilterParams): Promise<AdminFraudRule[]> => {
    const res = await apiClient.get<AdminFraudRule[]>('/admin/rules', { params });
    return res.data;
  },

  getRuleDetail: async (ruleId: string): Promise<AdminFraudRule> => {
    const res = await apiClient.get<AdminFraudRule>(`/admin/rules/${ruleId}`);
    return res.data;
  },

  updateRule: async (ruleId: string, payload: UpdateRulePayload): Promise<AdminFraudRule> => {
    const res = await apiClient.patch<AdminFraudRule>(`/admin/rules/${ruleId}`, payload);
    return res.data;
  },

  createRuleVersion: async (
    ruleId: string,
    payload: CreateRuleVersionPayload
  ): Promise<RuleVersion> => {
    const res = await apiClient.post<RuleVersion>(`/admin/rules/${ruleId}/versions`, payload);
    return res.data;
  },

  activateRuleVersion: async (
    ruleId: string,
    versionId: string,
    reason?: string
  ): Promise<AdminFraudRule> => {
    const res = await apiClient.post<AdminFraudRule>(
      `/admin/rules/${ruleId}/versions/${versionId}/activate`,
      null,
      { params: { reason } }
    );
    return res.data;
  },

  retireRuleVersion: async (
    ruleId: string,
    versionId: string,
    reason?: string
  ): Promise<AdminFraudRule> => {
    const res = await apiClient.post<AdminFraudRule>(
      `/admin/rules/${ruleId}/versions/${versionId}/retire`,
      null,
      { params: { reason } }
    );
    return res.data;
  },

  validateRuleConfig: async (
    ruleCode: string,
    configuration: Record<string, any>
  ): Promise<RuleConfigValidationResult> => {
    const res = await apiClient.post<RuleConfigValidationResult>('/admin/rules/validate', {
      rule_code: ruleCode,
      configuration,
    });
    return res.data;
  },

  compareRuleVersions: async (
    versionIdA: string,
    versionIdB: string
  ): Promise<RuleVersionComparisonResult> => {
    const res = await apiClient.post<RuleVersionComparisonResult>(
      '/admin/rules/versions/compare',
      {
        version_id_a: versionIdA,
        version_id_b: versionIdB,
      }
    );
    return res.data;
  },

  simulateRule: async (
    ruleId: string,
    payload: SimulateRulePayload
  ): Promise<RuleSimulationResult> => {
    const res = await apiClient.post<RuleSimulationResult>(
      `/admin/rules/${ruleId}/simulate`,
      payload
    );
    return res.data;
  },

  listRuleExecutions: async (
    ruleId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<RuleExecutionListResult> => {
    const res = await apiClient.get<RuleExecutionListResult>(
      `/admin/rules/${ruleId}/executions`,
      { params: { limit, offset } }
    );
    return res.data;
  },

  // Alert Engine Configuration
  getAlertConfig: async (): Promise<AlertEngineConfigData> => {
    const res = await apiClient.get<AlertEngineConfigData>('/admin/alerts/config');
    return res.data;
  },

  updateAlertConfig: async (payload: UpdateAlertConfigPayload): Promise<AlertEngineConfigData> => {
    const res = await apiClient.put<AlertEngineConfigData>('/admin/alerts/config', payload);
    return res.data;
  },
};
