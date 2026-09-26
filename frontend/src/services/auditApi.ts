"""
Audit Logging API Client.
Section 23 — Audit Logging.
"""
import { apiClient } from './api';
import {
  AuditLog,
  AuditLogListResponse,
  AuditStatsResponse,
  AuditLogFilterParams,
} from '../types';

export const auditApi = {
  listLogs: async (params?: AuditLogFilterParams): Promise<AuditLogListResponse> => {
    // Pass page & page_size to receive structured AuditLogListResponse
    const effectiveParams = {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 25,
      ...params,
    };
    const res = await apiClient.get<AuditLogListResponse | AuditLog[]>('/audit-logs', {
      params: effectiveParams,
    });

    // Normalize in case server returned array or object
    if (Array.isArray(res.data)) {
      return {
        total: res.data.length,
        page: effectiveParams.page,
        page_size: effectiveParams.page_size,
        total_pages: Math.max(1, Math.ceil(res.data.length / effectiveParams.page_size)),
        items: res.data,
      };
    }
    return res.data;
  },

  getLogDetail: async (auditLogId: string): Promise<AuditLog> => {
    const res = await apiClient.get<AuditLog>(`/audit-logs/${auditLogId}`);
    return res.data;
  },

  getStats: async (): Promise<AuditStatsResponse> => {
    const res = await apiClient.get<AuditStatsResponse>('/audit-logs/stats');
    return res.data;
  },
};
