import { apiClient } from './api';
import { SearchQueryRequest, SearchResponse, AutocompleteSuggestion } from '../types';

export const searchApi = {
  /**
   * Execute cross-entity historical search via POST query
   */
  querySearch: async (params: SearchQueryRequest): Promise<SearchResponse> => {
    const response = await apiClient.post<SearchResponse>('/search/query', params);
    return response.data;
  },

  /**
   * Execute search via GET query params (shareable URLs)
   */
  getSearch: async (params: Record<string, any>): Promise<SearchResponse> => {
    const response = await apiClient.get<SearchResponse>('/search', { params });
    return response.data;
  },

  /**
   * Fetch lightweight autocomplete suggestions
   */
  getAutocomplete: async (q: string, limit: number = 8): Promise<AutocompleteSuggestion[]> => {
    if (!q || q.trim().length === 0) return [];
    const response = await apiClient.get<AutocompleteSuggestion[]>('/search/autocomplete', {
      params: { q: q.trim(), limit },
    });
    return response.data;
  },
};
