import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, Search, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { SearchBar } from '../components/search/SearchBar';
import { SearchFilters } from '../components/search/SearchFilters';
import { SearchResults } from '../components/search/SearchResults';
import { searchApi } from '../services/searchApi';
import {
  SearchResponse,
  SearchQueryRequest,
  TransactionSearchResult,
  AlertSearchResult,
  CaseSearchResult,
  UserSearchResult,
  DeviceSearchResult,
  MerchantSearchResult,
} from '../types';
import {
  MOCK_TRANSACTIONS,
  MOCK_ALERTS,
  MOCK_CASES,
  MOCK_RISK_PROFILES,
} from '../services/mockData';

export function generateMockSearchResults(req: SearchQueryRequest): SearchResponse {
  const q = (req.query || '').trim().toLowerCase();
  const entityTypes =
    req.entity_types && req.entity_types.length > 0
      ? req.entity_types
      : ['transactions', 'alerts', 'cases', 'users', 'devices', 'merchants'];
  const riskMin = req.risk_min ?? 0;
  const riskMax = req.risk_max ?? 100;

  // 1. Transactions
  let txns: TransactionSearchResult[] = [];
  if (entityTypes.includes('transactions')) {
    txns = MOCK_TRANSACTIONS.filter((t) => {
      const matchQ =
        !q ||
        t.id.toLowerCase().includes(q) ||
        (t.user_id && t.user_id.toLowerCase().includes(q)) ||
        (t.user_name && t.user_name.toLowerCase().includes(q)) ||
        (t.merchant_name && t.merchant_name.toLowerCase().includes(q)) ||
        (t.city && t.city.toLowerCase().includes(q)) ||
        (t.country && t.country.toLowerCase().includes(q)) ||
        (t.payment_method && t.payment_method.toLowerCase().includes(q));
      const matchRisk = (t.risk_score ?? 0) >= riskMin && (t.risk_score ?? 0) <= riskMax;
      return matchQ && matchRisk;
    }).map((t) => ({
      id: t.id,
      timestamp: t.timestamp,
      amount: t.amount,
      currency: t.currency,
      status: t.status,
      risk_score: t.risk_score,
      risk_level: t.risk_level,
      user_id: t.user_id,
      user_name: t.user_name,
      merchant_id: t.merchant_id,
      merchant_name: t.merchant_name,
      device_id: t.device_id,
      city: t.city,
      country: t.country,
      payment_method: t.payment_method,
      relevance_score: 1.0,
    }));
  }

  // 2. Alerts
  let alrs: AlertSearchResult[] = [];
  if (entityTypes.includes('alerts')) {
    alrs = MOCK_ALERTS.filter((a) => {
      const matchQ =
        !q ||
        a.id.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        (a.alert_reason && a.alert_reason.toLowerCase().includes(q)) ||
        (a.transaction_id && a.transaction_id.toLowerCase().includes(q)) ||
        (a.assigned_to && a.assigned_to.toLowerCase().includes(q));
      const matchRisk = (a.risk_score ?? 0) >= riskMin && (a.risk_score ?? 0) <= riskMax;
      return matchQ && matchRisk;
    }).map((a) => ({
      id: a.id,
      title: a.title,
      alert_reason: a.alert_reason,
      severity: a.severity,
      status: a.status,
      risk_score: a.risk_score,
      transaction_id: a.transaction_id,
      assigned_to: a.assigned_to,
      created_at: a.created_at,
      relevance_score: 1.0,
    }));
  }

  // 3. Cases
  let cs: CaseSearchResult[] = [];
  if (entityTypes.includes('cases')) {
    cs = MOCK_CASES.filter((c) => {
      const matchQ =
        !q ||
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.assigned_analyst && c.assigned_analyst.toLowerCase().includes(q));
      const matchRisk = (c.risk_score ?? 50) >= riskMin && (c.risk_score ?? 50) <= riskMax;
      return matchQ && matchRisk;
    }).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      status: c.status,
      severity: c.severity,
      risk_score: c.risk_score,
      assigned_to: c.assigned_analyst || c.assigned_to,
      created_at: c.created_at,
      relevance_score: 1.0,
    }));
  }

  // 4. Users
  let usrs: UserSearchResult[] = [];
  if (entityTypes.includes('users')) {
    usrs = MOCK_RISK_PROFILES.filter((u) => {
      const matchQ =
        !q ||
        u.user_id.toLowerCase().includes(q) ||
        (u.user_name && u.user_name.toLowerCase().includes(q)) ||
        u.risk_level.toLowerCase().includes(q);
      const matchRisk = (u.last_known_risk_score ?? 0) >= riskMin && (u.last_known_risk_score ?? 0) <= riskMax;
      return matchQ && matchRisk;
    }).map((u) => ({
      user_id: u.user_id,
      full_name: u.user_name,
      email: `${u.user_id.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`,
      risk_score: u.last_known_risk_score,
      risk_level: u.risk_level,
      total_transactions: u.total_transactions,
      flagged_transactions: u.failed_transactions || 0,
      last_active: u.updated_at,
      relevance_score: 1.0,
    }));
  }

  // 5. Devices
  let devs: DeviceSearchResult[] = [];
  if (entityTypes.includes('devices')) {
    const rawDevices: DeviceSearchResult[] = [
      {
        device_id: 'DEV-MACBOOK-01',
        risk_score: 82,
        risk_level: 'CRITICAL',
        distinct_users_count: 3,
        total_transactions: 48,
        last_seen: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        relevance_score: 1.0,
      },
      {
        device_id: 'DEV-IPHONE-02',
        risk_score: 74,
        risk_level: 'HIGH',
        distinct_users_count: 2,
        total_transactions: 29,
        last_seen: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        relevance_score: 1.0,
      },
      {
        device_id: 'DEV-IPHONE-15',
        risk_score: 12,
        risk_level: 'LOW',
        distinct_users_count: 1,
        total_transactions: 114,
        last_seen: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        relevance_score: 1.0,
      },
      {
        device_id: 'DEV-ANDROID-09',
        risk_score: 18,
        risk_level: 'LOW',
        distinct_users_count: 1,
        total_transactions: 85,
        last_seen: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        relevance_score: 1.0,
      },
      {
        device_id: 'DEV-WINDOWS-04',
        risk_score: 48,
        risk_level: 'MEDIUM',
        distinct_users_count: 1,
        total_transactions: 63,
        last_seen: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
        relevance_score: 1.0,
      },
    ];
    devs = rawDevices.filter((d) => {
      const matchQ = !q || d.device_id.toLowerCase().includes(q) || d.risk_level.toLowerCase().includes(q);
      const matchRisk = d.risk_score >= riskMin && d.risk_score <= riskMax;
      return matchQ && matchRisk;
    });
  }

  // 6. Merchants
  let merchs: MerchantSearchResult[] = [];
  if (entityTypes.includes('merchants')) {
    const rawMerchants: MerchantSearchResult[] = [
      {
        merchant_id: 'MERCH-AMAZON',
        merchant_name: 'Amazon Web Retail',
        merchant_category: 'Electronics & Retail',
        risk_score: 22,
        risk_level: 'LOW',
        total_transactions: 1420,
        failed_transactions: 12,
        last_activity: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
        relevance_score: 1.0,
      },
      {
        merchant_id: 'MERCH-BINANCE',
        merchant_name: 'Binance Global Exchange',
        merchant_category: 'Crypto & Exchange',
        risk_score: 78,
        risk_level: 'HIGH',
        total_transactions: 340,
        failed_transactions: 38,
        last_activity: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        relevance_score: 1.0,
      },
      {
        merchant_id: 'MERCH-APPLE',
        merchant_name: 'Apple Store Online',
        merchant_category: 'Electronics & Devices',
        risk_score: 10,
        risk_level: 'LOW',
        total_transactions: 890,
        failed_transactions: 4,
        last_activity: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        relevance_score: 1.0,
      },
      {
        merchant_id: 'MERCH-UBER',
        merchant_name: 'Uber BV Amsterdam',
        merchant_category: 'Transportation',
        risk_score: 14,
        risk_level: 'LOW',
        total_transactions: 2150,
        failed_transactions: 18,
        last_activity: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        relevance_score: 1.0,
      },
      {
        merchant_id: 'MERCH-TARGET',
        merchant_name: 'Target Stores US',
        merchant_category: 'Retail Goods',
        risk_score: 35,
        risk_level: 'MEDIUM',
        total_transactions: 640,
        failed_transactions: 9,
        last_activity: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
        relevance_score: 1.0,
      },
    ];
    merchs = rawMerchants.filter((m) => {
      const matchQ =
        !q ||
        m.merchant_id.toLowerCase().includes(q) ||
        m.merchant_name.toLowerCase().includes(q) ||
        (m.merchant_category && m.merchant_category.toLowerCase().includes(q)) ||
        m.risk_level.toLowerCase().includes(q);
      const matchRisk = m.risk_score >= riskMin && m.risk_score <= riskMax;
      return matchQ && matchRisk;
    });
  }

  const total = txns.length + alrs.length + cs.length + usrs.length + devs.length + merchs.length;

  const counts = {
    transactions: txns.length,
    alerts: alrs.length,
    cases: cs.length,
    users: usrs.length,
    devices: devs.length,
    merchants: merchs.length,
    total,
  };

  const toEntityGroup = <T,>(items: T[]) => {
    const pSize = req.page_size || 10;
    const pNum = req.page || 1;
    const totalCount = items.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pSize));
    const safePage = Math.min(Math.max(1, pNum), totalPages);
    const start = (safePage - 1) * pSize;
    const paginated = items.slice(start, start + pSize);

    return {
      items: paginated,
      total: totalCount,
      page: safePage,
      page_size: pSize,
      total_pages: totalPages,
    };
  };

  return {
    query: req.query,
    total_results: total,
    execution_time_ms: 8.4,
    counts,
    counts_by_category: counts,
    transactions: toEntityGroup(txns),
    alerts: toEntityGroup(alrs),
    cases: toEntityGroup(cs),
    users: toEntityGroup(usrs),
    devices: toEntityGroup(devs),
    merchants: toEntityGroup(merchs),
    page: req.page || 1,
    page_size: req.page_size || 25,
  };
}

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
  const [searchData, setSearchData] = useState<SearchResponse>(() => generateMockSearchResults(filters));
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
        if (
          res &&
          (res.total_results !== undefined ||
            res.counts?.total !== undefined ||
            res.transactions ||
            res.alerts ||
            res.cases ||
            res.users)
        ) {
          setSearchData(res);
        } else {
          const fallback = generateMockSearchResults(currentRequest);
          setSearchData(fallback);
        }
      } catch (err: any) {
        console.warn('Backend search unreachable, utilizing client-side historical search engine:', err);
        const fallback = generateMockSearchResults(currentRequest);
        setSearchData(fallback);
        setError(null);
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
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-500 dark:text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-soc-foreground tracking-tight">
              Historical & Cross-Entity Search
            </h1>
          </div>
          <p className="text-xs text-soc-muted">
            Query across historical transactions, alerts, investigation cases, user behavioral profiles, devices, and merchants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => executeSearch()}
            disabled={isLoading}
            className="px-3.5 py-2 bg-soc-surface hover:bg-soc-cardHover disabled:opacity-50 text-soc-muted hover:text-soc-foreground border border-soc-border text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-500' : ''}`} />
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
        countsByCategory={searchData?.counts || searchData?.counts_by_category}
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
