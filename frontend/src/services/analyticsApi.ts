import { apiClient } from './api';
import {
  AnalyticsFilterParams,
  AnalyticsOverviewResponse,
  TransactionAnalyticsResponse,
  RiskAnalyticsResponse,
  AlertAnalyticsResponse,
  MLAnomalyAnalyticsResponse,
  RuleAnalyticsResponse,
  CaseAnalyticsResponse,
  GeographicAnalyticsResponse,
  EntityPatternsResponse,
} from '../types';

export const analyticsApi = {
  getOverview: async (params: AnalyticsFilterParams): Promise<AnalyticsOverviewResponse> => {
    const res = await apiClient.get<AnalyticsOverviewResponse>('/analytics/overview', { params });
    return res.data;
  },

  getTransactions: async (params: AnalyticsFilterParams): Promise<TransactionAnalyticsResponse> => {
    const res = await apiClient.get<TransactionAnalyticsResponse>('/analytics/transactions', { params });
    return res.data;
  },

  getRisk: async (params: AnalyticsFilterParams): Promise<RiskAnalyticsResponse> => {
    const res = await apiClient.get<RiskAnalyticsResponse>('/analytics/risk', { params });
    return res.data;
  },

  getAlerts: async (params: AnalyticsFilterParams): Promise<AlertAnalyticsResponse> => {
    const res = await apiClient.get<AlertAnalyticsResponse>('/analytics/alerts', { params });
    return res.data;
  },

  getML: async (params: AnalyticsFilterParams): Promise<MLAnomalyAnalyticsResponse> => {
    const res = await apiClient.get<MLAnomalyAnalyticsResponse>('/analytics/ml', { params });
    return res.data;
  },

  getRules: async (params: AnalyticsFilterParams): Promise<RuleAnalyticsResponse> => {
    const res = await apiClient.get<RuleAnalyticsResponse>('/analytics/rules', { params });
    return res.data;
  },

  getCases: async (params: AnalyticsFilterParams): Promise<CaseAnalyticsResponse> => {
    const res = await apiClient.get<CaseAnalyticsResponse>('/analytics/cases', { params });
    return res.data;
  },

  getGeographic: async (params: AnalyticsFilterParams): Promise<GeographicAnalyticsResponse> => {
    const res = await apiClient.get<GeographicAnalyticsResponse>('/analytics/geographic', { params });
    return res.data;
  },

  getEntities: async (params: AnalyticsFilterParams): Promise<EntityPatternsResponse> => {
    const res = await apiClient.get<EntityPatternsResponse>('/analytics/entities', { params });
    return res.data;
  },
};
