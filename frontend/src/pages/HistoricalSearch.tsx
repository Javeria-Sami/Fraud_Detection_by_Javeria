import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, Search, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { SearchBar } from '../components/search/SearchBar';
import { SearchFilters } from '../components/search/SearchFilters';
import { SearchResults } from '../components/search/SearchResults';
import { searchApi } from '../services/searchApi';
import { SearchResponse, SearchQueryRequest } from '../types';

export const HistoricalSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search input state
  const [query, setQuery] = useState<string>(searchParams.get('q') || '');

  // Advanced filters state
  const [filters, setFilters] = useState<SearchQueryRequest>(() => {
    const entityParam = searchParams.get('entity');
    const entities = entityParam ? (entityParam.split(',') as any) : undefined;
    const riskMin = searchParams.get('risk_min');
    const riskMax = searchParams.get('risk_max');
    const pageParam = searchParams.get('page');
    const sortByParam = searchParams.get('sort_by');

    return {
      query: searchParams.get('q') || undefined,
      entity_types: entities,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      risk_min: riskMin ? Number(riskMin) : undefined,
      risk_max: riskMax ? Number(riskMax) : undefined,
      sort_by: (sortByParam as any) || 'relevance',
      page: pageParam ? Number(pageParam) : 1,
      page_size: 25,
    };
  });

  const [activeTab, setActiveTab] = useState<'all' | 'transactions' | 'alerts' | 'cases' | 'users' | 'devices' | 'merchants'>('all');
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state to URL search parameters
  const updateURL = useCallback(
    (newFilters: SearchQueryRequest) => {
      const params = new URLSearchParams();
      if (newFilters.query) params.set('q', newFilters.query);
      if (newFilters.entity_types && newFilters.entity_types.length > 0) {
        params.set('entity', newFilters.entity_types.join(','));
      }
      if (newFilters.date_from) params.set('date_from', newFilters.date_from);
      if (newFilters.date_to) params.set('date_to', newFilters.date_to);
      if (newFilters.risk_min !== undefined) params.set('risk_min', String(newFilters.risk_min));
      if (newFilters.risk_max !== undefined) params.set('risk_max', String(newFilters.risk_max));
      if (newFilters.sort_by && newFilters.sort_by !== 'relevance') params.set('sort_by', newFilters.sort_by);
      if (newFilters.page && newFilters.page > 1) params.set('page', String(newFilters.page));

      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  const executeSearch = useCallback(
    async (requestOverrides?: Partial<SearchQueryRequest>) => {
      const currentRequest: SearchQueryRequest = {
        ...filters,
        query: query.trim() || undefined,
        ...requestOverrides,
      };

      try {
        setIsLoading(true);
        setError(null);
        updateURL(currentRequest);

        const res = await searchApi.querySearch(currentRequest);
        setSearchData(res);
      } catch (err: any) {
        console.error('Search query failed:', err);
        setError(err?.response?.data?.detail || 'Failed to complete search query. Please try again.');
        setSearchData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [filters, query, updateURL]
  );

  // Initial load
  useEffect(() => {
    executeSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchClick = (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    setFilters((prev) => ({ ...prev, query: q.trim() || undefined, page: 1 }));
    executeSearch({ query: q.trim() || undefined, page: 1 });
  };

  const handleFilterChange = (updated: Partial<SearchQueryRequest>) => {
    setFilters((prev) => {
      const next = { ...prev, ...updated };
      executeSearch(next);
      return next;
    });
  };

  const handleResetFilters = () => {
    const resetState: SearchQueryRequest = {
      query: query.trim() || undefined,
      page: 1,
      page_size: 25,
      sort_by: 'relevance',
    };
    setFilters(resetState);
    executeSearch(resetState);
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => {
      const next = { ...prev, page: newPage };
      executeSearch(next);
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
              Historical & Cross-Entity Search
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Query across historical transactions, alerts, investigation cases, user behavioral profiles, devices, and merchants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => executeSearch()}
            disabled={isLoading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="w-full">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearchClick}
          isLoading={isLoading}
        />
      </div>

      {/* Advanced Filter Panel */}
      <SearchFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        onApply={() => executeSearch()}
        countsByCategory={searchData?.counts_by_category}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => executeSearch()}
            className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-lg font-semibold text-[11px]"
          >
            Retry Search
          </button>
        </div>
      )}

      {/* Categorized Results */}
      <SearchResults
        data={searchData}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentPage={filters.page || 1}
        onPageChange={handlePageChange}
        isLoading={isLoading}
      />
    </div>
  );
};
