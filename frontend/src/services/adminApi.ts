import { apiClient } from './api';
import {
  AdminFraudRule,
  RuleVersion,
  RuleConfigValidationResult,
  RuleVersionComparisonResult,
  RuleSimulationResult,
  RuleExecutionListResult,
  AlertEngineConfigData,
  AdminOverviewResponse,
  PlatformStatusResponse,
  AdminUserListResponse,
  AdminUserDetailResponse,
  AdminUserListItem,
  AdminUserCreateRequest,
  UserStatusUpdateRequest,
  UserRoleUpdateRequest,
  RoleDetailResponse,
  PermissionItem,
  PermissionMatrixResponse,
  AdminSettingsListResponse,
  AdminSettingItem,
  AdminSettingUpdateRequest,
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

export interface ListUsersFilterParams {
  query?: string;
  role?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
}

export const adminApi = {
  // 1. Overview & Platform Diagnostics
  getOverview: async (): Promise<AdminOverviewResponse> => {
    const res = await apiClient.get<AdminOverviewResponse>('/admin/overview');
    return res.data;
  },

  getPlatformStatus: async (): Promise<PlatformStatusResponse> => {
    const res = await apiClient.get<PlatformStatusResponse>('/admin/platform/status');
    return res.data;
  },

  // 2. User Management
  listUsers: async (params?: ListUsersFilterParams): Promise<AdminUserListResponse> => {
    const res = await apiClient.get<AdminUserListResponse>('/admin/users', { params });
    return res.data;
  },

  getUserDetail: async (userId: string): Promise<AdminUserDetailResponse> => {
    const res = await apiClient.get<AdminUserDetailResponse>(`/admin/users/${userId}`);
    return res.data;
  },

  createUser: async (payload: AdminUserCreateRequest): Promise<AdminUserListItem> => {
    const res = await apiClient.post<AdminUserListItem>('/admin/users', payload);
    return res.data;
  },

  updateUserStatus: async (
    userId: string,
    payload: UserStatusUpdateRequest
  ): Promise<AdminUserListItem> => {
    const res = await apiClient.patch<AdminUserListItem>(`/admin/users/${userId}/status`, payload);
    return res.data;
  },

  updateUserRole: async (
    userId: string,
    payload: UserRoleUpdateRequest
  ): Promise<AdminUserListItem> => {
    const res = await apiClient.patch<AdminUserListItem>(`/admin/users/${userId}/role`, payload);
    return res.data;
  },

  // 3. Roles & Permissions
  listRoles: async (): Promise<RoleDetailResponse[]> => {
    const res = await apiClient.get<RoleDetailResponse[]>('/admin/roles');
    return res.data;
  },

  listPermissions: async (): Promise<PermissionItem[]> => {
    const res = await apiClient.get<PermissionItem[]>('/admin/permissions');
    return res.data;
  },

  getPermissionMatrix: async (): Promise<PermissionMatrixResponse> => {
    const res = await apiClient.get<PermissionMatrixResponse>('/admin/permission-matrix');
    return res.data;
  },

  // 4. System Settings
  listSettings: async (): Promise<AdminSettingsListResponse> => {
    const res = await apiClient.get<AdminSettingsListResponse>('/admin/settings');
    return res.data;
  },

  updateSetting: async (
    key: string,
    payload: AdminSettingUpdateRequest
  ): Promise<AdminSettingItem> => {
    const res = await apiClient.put<AdminSettingItem>(`/admin/settings/${key}`, payload);
    return res.data;
  },

  // 5. Fraud Rules (Preserved from Section 19)
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

  // 6. Alert Engine Configuration (Preserved from Section 19)
  getAlertConfig: async (): Promise<AlertEngineConfigData> => {
    const res = await apiClient.get<AlertEngineConfigData>('/admin/alerts/config');
    return res.data;
  },

  updateAlertConfig: async (payload: UpdateAlertConfigPayload): Promise<AlertEngineConfigData> => {
    const res = await apiClient.put<AlertEngineConfigData>('/admin/alerts/config', payload);
    return res.data;
  },
};
