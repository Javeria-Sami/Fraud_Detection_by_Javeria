import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { Case, CaseStats, CasePaginatedResponse } from '../types';
import { MOCK_CASES, extractSafeArray } from '../services/mockData';
import { CasesHeader } from '../components/cases/CasesHeader';
import { CaseKPIs } from '../components/cases/CaseKPIs';
import { CaseFilterBar } from '../components/cases/CaseFilterBar';
import { CasesTable } from '../components/cases/CasesTable';
import { CasesPagination } from '../components/cases/CasesPagination';
import { CreateCaseModal } from '../components/cases/CreateCaseModal';

export const Cases: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscribe } = useWebSocket();

  // URL state synchronization
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [severityFilter, setSeverityFilter] = useState<string>(searchParams.get('severity') || '');
  const [analystFilter, setAnalystFilter] = useState<string>(searchParams.get('analyst') || '');
  const [page, setPage] = useState<number>(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState<number>(Number(searchParams.get('page_size')) || 25);
  const [sortBy, setSortBy] = useState<string>(searchParams.get('sort_by') || 'created_at');
  const [order, setOrder] = useState<string>(searchParams.get('order') || 'desc');

  // Data state
  const [cases, setCases] = useState<Case[]>([]);
  const [totalCases, setTotalCases] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [prefillData, setPrefillData] = useState<{
    userId?: string;
    transactionId?: string;
    alertId?: string;
    severity?: string;
    title?: string;
  } | undefined>(undefined);

  // Check navigation prefill from Alert Center or Explorer
  useEffect(() => {
    if (location.state) {
      const state = location.state as any;
      if (state.prefillUserId || state.prefillTxnId || state.prefillAlertId || state.prefillSeverity || state.prefillTitle) {
        setPrefillData({
          userId: state.prefillUserId,
          transactionId: state.prefillTxnId,
          alertId: state.prefillAlertId,
          severity: state.prefillSeverity,
          title: state.prefillTitle,
        });
        setShowCreateModal(true);
      }
    }
  }, [location.state]);

  // Sync to URL parameters
  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    if (severityFilter) params.severity = severityFilter;
    if (analystFilter) params.analyst = analystFilter;
    if (page > 1) params.page = String(page);
    if (pageSize !== 25) params.page_size = String(pageSize);
    if (sortBy !== 'created_at') params.sort_by = sortBy;
    if (order !== 'desc') params.order = order;
    setSearchParams(params, { replace: true });
  }, [search, statusFilter, severityFilter, analystFilter, page, pageSize, sortBy, order, setSearchParams]);

  // Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient.get<CaseStats>('/cases/stats');
      if (res.data && typeof res.data.total_cases === 'number') {
        setStats(res.data);
      } else {
        setStats({
          total_cases: MOCK_CASES.length,
          open_cases: MOCK_CASES.filter(c => c.status === 'OPEN').length,
          investigating_cases: MOCK_CASES.filter(c => c.status === 'INVESTIGATING').length,
          critical_cases: MOCK_CASES.filter(c => c.severity === 'CRITICAL').length,
          unassigned_cases: 0,
          resolved_today: 0,
        });
      }
    } catch (err) {
      console.warn('Failed to load case stats, using active defaults:', err);
      setStats({
        total_cases: MOCK_CASES.length,
        open_cases: MOCK_CASES.filter(c => c.status === 'OPEN').length,
        investigating_cases: MOCK_CASES.filter(c => c.status === 'INVESTIGATING').length,
        critical_cases: MOCK_CASES.filter(c => c.severity === 'CRITICAL').length,
        unassigned_cases: 0,
        resolved_today: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Paginated Cases
  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort_by: sortBy,
        order: order,
      });
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (severityFilter && severityFilter !== 'ALL') params.append('severity', severityFilter);
      if (analystFilter && analystFilter !== 'ALL') params.append('assigned_analyst', analystFilter);

      const res = await apiClient.get<CasePaginatedResponse>(`/cases/paginated?${params.toString()}`);
      const safeItems = extractSafeArray<Case>(res.data, MOCK_CASES);
      setCases(safeItems.length > 0 ? safeItems : MOCK_CASES);
      setTotalCases(res.data?.total || (safeItems.length > 0 ? safeItems.length : MOCK_CASES.length));
      setTotalPages(res.data?.total_pages || 1);
    } catch (err) {
      console.warn('Failed to load cases, using active defaults:', err);
      setCases(MOCK_CASES);
      setTotalCases(MOCK_CASES.length);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, order, search, statusFilter, severityFilter, analystFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // WebSocket real-time subscription
  useEffect(() => {
    const unsubCreated = subscribe('case.created', () => {
      fetchCases();
      fetchStats();
    });
    const unsubUpdated = subscribe('case.updated', () => {
      fetchCases();
      fetchStats();
    });
    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, [subscribe, fetchCases, fetchStats]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setOrder('desc');
    }
    setPage(1);
  };

  const handleFilterByStatus = (target: string) => {
    if (target === 'ALL') {
      setStatusFilter('');
      setSeverityFilter('');
    } else if (target === 'CRITICAL_SEV') {
      setSeverityFilter('CRITICAL');
      setStatusFilter('');
    } else {
      setStatusFilter(target);
      setSeverityFilter('');
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setSeverityFilter('');
    setAnalystFilter('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || statusFilter || severityFilter || analystFilter);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <CasesHeader
        onRefresh={() => {
          fetchStats();
          fetchCases();
        }}
        onCreateCase={() => {
          setPrefillData(undefined);
          setShowCreateModal(true);
        }}
        isLoading={isLoading}
        totalCount={totalCases}
      />

      {/* KPI Cards */}
      <CaseKPIs
        stats={stats}
        isLoading={statsLoading}
        activeStatusFilter={severityFilter === 'CRITICAL' ? 'CRITICAL_SEV' : statusFilter || 'ALL'}
        onFilterByStatus={handleFilterByStatus}
      />

      {/* Filter Bar */}
      <CaseFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        severityFilter={severityFilter}
        onSeverityChange={(val) => {
          setSeverityFilter(val);
          setPage(1);
        }}
        analystFilter={analystFilter}
        onAnalystChange={(val) => {
          setAnalystFilter(val);
          setPage(1);
        }}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Cases Table */}
      <CasesTable
        cases={cases}
        isLoading={isLoading}
        sortBy={sortBy}
        order={order}
        onSort={handleSort}
      />

      {/* Pagination Controls */}
      <CasesPagination
        page={page}
        pageSize={pageSize}
        total={totalCases}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setPage(1);
        }}
      />

      {/* Create Case Modal */}
      <CreateCaseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCaseCreated={(newCase) => {
          fetchStats();
          fetchCases();
          navigate(`/cases/${newCase.id}`);
        }}
        initialData={prefillData}
      />
    </div>
  );
};
