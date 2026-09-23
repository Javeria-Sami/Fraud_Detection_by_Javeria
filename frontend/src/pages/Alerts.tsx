import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { Alert, AlertStats, AlertPaginatedResponse } from '../types';
import { AlertsHeader } from '../components/alerts/AlertsHeader';
import { AlertKPIs } from '../components/alerts/AlertKPIs';
import { AlertFilterBar, AlertFilterValues } from '../components/alerts/AlertFilterBar';
import { AlertsTable } from '../components/alerts/AlertsTable';
import { AlertsPagination } from '../components/alerts/AlertsPagination';
import { AlertDetailDrawer } from '../components/alerts/AlertDetailDrawer';

export const Alerts: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { status: wsStatus, latestAlert, subscribe } = useWebSocket();
  const { user } = useAuth();

  // Read initial query params from URL
  const searchParam = searchParams.get('search') || '';
  const severityParam = searchParams.get('severity') || '';
  const statusParam = searchParams.get('status') || '';
  const minRiskScoreParam = searchParams.get('min_risk_score') || '';
  const maxRiskScoreParam = searchParams.get('max_risk_score') || '';
  const startDateParam = searchParams.get('start_date') || '';
  const endDateParam = searchParams.get('end_date') || '';
  const assignedToParam = searchParams.get('assigned_to') || '';
  const sortByParam = searchParams.get('sort_by') || 'created_at';
  const orderParam = (searchParams.get('order') as 'asc' | 'desc') || 'desc';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const pageSizeParam = parseInt(searchParams.get('page_size') || '25', 10);
  const selectedParam = searchParams.get('selected') || null;

  // Filter state
  const [filters, setFilters] = useState<AlertFilterValues>({
    search: searchParam,
    severity: severityParam,
    status: statusParam,
    minRiskScore: minRiskScoreParam,
    maxRiskScore: maxRiskScoreParam,
    startDate: startDateParam,
    endDate: endDateParam,
    assignedTo: assignedToParam,
  });

  const [sortBy, setSortBy] = useState<string>(sortByParam);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(orderParam);
  const [page, setPage] = useState<number>(pageParam);
  const [pageSize, setPageSize] = useState<number>(pageSizeParam);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(selectedParam);
  const [lastSynced, setLastSynced] = useState<string>(new Date().toLocaleTimeString());

  // Data state
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState<boolean>(true);
  const [alertsData, setAlertsData] = useState<AlertPaginatedResponse | null>(null);
  const [isAlertsLoading, setIsAlertsLoading] = useState<boolean>(true);

  // Synchronize state with URL parameters
  const updateUrlParams = useCallback(
    (newParams: Record<string, string | number | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(newParams).forEach(([k, v]) => {
          if (v === null || v === '' || v === undefined) {
            next.delete(k);
          } else {
            next.set(k, String(v));
          }
        });
        return next;
      });
    },
    [setSearchParams]
  );

  const handleFilterChange = (newFilters: Partial<AlertFilterValues>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    setPage(1);
    updateUrlParams({
      search: updated.search || null,
      severity: updated.severity || null,
      status: updated.status || null,
      min_risk_score: updated.minRiskScore || null,
      max_risk_score: updated.maxRiskScore || null,
      start_date: updated.startDate || null,
      end_date: updated.endDate || null,
      assigned_to: updated.assignedTo || null,
      page: 1,
    });
  };

  const handleResetFilters = () => {
    const cleanFilters: AlertFilterValues = {
      search: '',
      severity: '',
      status: '',
      minRiskScore: '',
      maxRiskScore: '',
      startDate: '',
      endDate: '',
      assignedTo: '',
    };
    setFilters(cleanFilters);
    setPage(1);
    updateUrlParams({
      search: null,
      severity: null,
      status: null,
      min_risk_score: null,
      max_risk_score: null,
      start_date: null,
      end_date: null,
      assigned_to: null,
      page: 1,
    });
  };

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(field);
    setSortOrder(newOrder);
    setPage(1);
    updateUrlParams({ sort_by: field, order: newOrder, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrlParams({ page: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    updateUrlParams({ page_size: newSize, page: 1 });
  };

  const handleSelectAlert = (alertId: string | null) => {
    setSelectedAlertId(alertId);
    updateUrlParams({ selected: alertId });
  };

  // 1. Fetch Alert Stats
  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const res = await apiClient.get<AlertStats>('/alerts/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load alert stats:', err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  // 2. Fetch Paginated Alerts
  const fetchAlerts = async () => {
    setIsAlertsLoading(true);
    try {
      let url = `/alerts/paginated?page=${page}&page_size=${pageSize}&sort_by=${sortBy}&order=${sortOrder}`;
      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
      if (filters.severity) url += `&severity=${filters.severity}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.minRiskScore) url += `&min_risk_score=${filters.minRiskScore}`;
      if (filters.maxRiskScore) url += `&max_risk_score=${filters.maxRiskScore}`;
      if (filters.startDate) url += `&start_date=${encodeURIComponent(filters.startDate + 'T00:00:00Z')}`;
      if (filters.endDate) url += `&end_date=${encodeURIComponent(filters.endDate + 'T23:59:59Z')}`;
      if (filters.assignedTo) url += `&assigned_to=${encodeURIComponent(filters.assignedTo)}`;

      const res = await apiClient.get<AlertPaginatedResponse>(url);
      setAlertsData(res.data);
      setLastSynced(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load paginated alerts:', err);
    } finally {
      setIsAlertsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [page, pageSize, sortBy, sortOrder, filters]);

  // Real-time WebSocket event listeners
  useEffect(() => {
    const unsubCreated = subscribe('alert.created', (newAlert: Alert) => {
      fetchAlerts();
      fetchStats();
      setLastSynced(new Date().toLocaleTimeString());
    });

    const unsubUpdated = subscribe('alert.updated', (diff: any) => {
      fetchAlerts();
      fetchStats();
      setLastSynced(new Date().toLocaleTimeString());
    });

    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, [subscribe]);

  const handleRefreshAll = () => {
    fetchStats();
    fetchAlerts();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <AlertsHeader
        isLoading={isAlertsLoading}
        totalAlerts={alertsData?.total ?? 0}
        lastUpdated={lastSynced}
        isLive={wsStatus === 'CONNECTED'}
        onRefresh={handleRefreshAll}
      />

      {/* KPI Cards */}
      <AlertKPIs
        stats={stats ?? null}
        isLoading={isStatsLoading}
        selectedStatus={filters.status}
        selectedSeverity={filters.severity}
        onFilterClick={(type, value) => handleFilterChange({ [type]: value })}
      />

      {/* Filter Bar */}
      <AlertFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Alerts Table */}
      <AlertsTable
        alerts={alertsData?.items ?? []}
        isLoading={isAlertsLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onSelectAlert={handleSelectAlert}
        selectedAlertId={selectedAlertId}
        onResetFilters={handleResetFilters}
      />

      {/* Pagination */}
      {alertsData && alertsData.total > 0 && (
        <AlertsPagination
          currentPage={alertsData.page}
          pageSize={alertsData.page_size}
          totalRecords={alertsData.total}
          totalPages={alertsData.total_pages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isLoading={isAlertsLoading}
        />
      )}

      {/* Slide-out Investigation Drawer */}
      {selectedAlertId && (
        <AlertDetailDrawer
          alertId={selectedAlertId}
          onClose={() => handleSelectAlert(null)}
          userRole={user?.role}
          onAlertUpdated={handleRefreshAll}
        />
      )}
    </div>
  );
};
