import { apiClient } from './api';
import {
  ModelHealthSummary,
  FeatureDriftMatrix,
  MonitoringRunItem,
  MonitoringRunDetail,
  MLMonitoringConfig,
  MLMonitoredModel,
} from '../types';

export interface TriggerMonitoringRunParams {
  model_version_id?: string;
  monitoring_window_hours?: number;
  reference_window_days?: number;
  monitoring_window_start?: string;
  monitoring_window_end?: string;
  reference_window_start?: string;
  reference_window_end?: string;
}

export const mlMonitoringApi = {
  getHealthSummary: async (modelVersionId?: string) => {
    const params = modelVersionId ? { model_version_id: modelVersionId } : {};
    const res = await apiClient.get<ModelHealthSummary>('/ml-monitoring/health', { params });
    return res.data;
  },

  getMonitoredModels: async () => {
    const res = await apiClient.get<MLMonitoredModel[]>('/ml-monitoring/models');
    return res.data;
  },

  getFeatureDriftMatrix: async (modelVersionId?: string, runId?: string) => {
    const params: Record<string, string> = {};
    if (modelVersionId) params.model_version_id = modelVersionId;
    if (runId) params.run_id = runId;
    const res = await apiClient.get<FeatureDriftMatrix>('/ml-monitoring/drift', { params });
    return res.data;
  },

  getMonitoringRuns: async (modelVersionId?: string, limit = 20, offset = 0) => {
    const params: Record<string, any> = { limit, offset };
    if (modelVersionId) params.model_version_id = modelVersionId;
    const res = await apiClient.get<{ total: number; runs: MonitoringRunItem[] }>('/ml-monitoring/runs', { params });
    return res.data;
  },

  getMonitoringRunDetail: async (runId: string) => {
    const res = await apiClient.get<MonitoringRunDetail>(`/ml-monitoring/runs/${runId}`);
    return res.data;
  },

  triggerMonitoringRun: async (data: TriggerMonitoringRunParams) => {
    const res = await apiClient.post<MonitoringRunDetail>('/ml-monitoring/run', data);
    return res.data;
  },

  getMonitoringConfig: async () => {
    const res = await apiClient.get<MLMonitoringConfig>('/ml-monitoring/config');
    return res.data;
  },

  updateMonitoringConfig: async (data: Partial<MLMonitoringConfig>) => {
    const res = await apiClient.put<MLMonitoringConfig>('/ml-monitoring/config', data);
    return res.data;
  },
};
