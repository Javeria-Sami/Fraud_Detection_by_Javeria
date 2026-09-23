import { apiClient } from './api';
import {
  RetrainingRunItem,
  RetrainingRunListResponse,
  StartRetrainingParams,
  MLRetrainingConfig,
} from '../types';

export const mlRetrainingApi = {
  triggerRetraining: async (params: StartRetrainingParams) => {
    const res = await apiClient.post<RetrainingRunItem>('/ml-retraining/run', params);
    return res.data;
  },

  listRuns: async (limit = 20, offset = 0) => {
    const res = await apiClient.get<RetrainingRunListResponse>('/ml-retraining/runs', {
      params: { limit, offset },
    });
    return res.data;
  },

  getRunDetail: async (runId: string) => {
    const res = await apiClient.get<RetrainingRunItem>(`/ml-retraining/runs/${runId}`);
    return res.data;
  },

  cancelRun: async (runId: string) => {
    const res = await apiClient.post<RetrainingRunItem>(`/ml-retraining/runs/${runId}/cancel`);
    return res.data;
  },

  getConfig: async () => {
    const res = await apiClient.get<MLRetrainingConfig>('/ml-retraining/config');
    return res.data;
  },

  updateConfig: async (updates: Partial<MLRetrainingConfig>) => {
    const res = await apiClient.put<MLRetrainingConfig>('/ml-retraining/config', updates);
    return res.data;
  },
};
