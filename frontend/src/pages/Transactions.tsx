import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useRealtime } from '../hooks/useRealtime';
import { Transaction } from '../types';
import { MOCK_TRANSACTIONS, extractSafeArray } from '../services/mockData';

import { TransactionFilterBar, FilterValues } from '../components/explorer/TransactionFilterBar';
import { TransactionResultsTable } from '../components/explorer/TransactionResultsTable';
import { TransactionPagination } from '../components/explorer/TransactionPagination';
import { TransactionDetailDrawer } from '../components/explorer/TransactionDetailDrawer';

import {
  Download,
  RefreshCw,
  PlusCircle,
  X,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Transactions: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filters state from URL query parameters
  const [filters, setFilters] = useState<FilterValues>({
    search: searchParams.get('search') || '',
    risk_level: searchParams.get('risk_level') || '',
    status: searchParams.get('status') || '',
    currency: searchParams.get('currency') || '',
    min_amount: searchParams.get('min_amount') || '',
    max_amount: searchParams.get('max_amount') || '',
    start_date: searchParams.get('start_date') || '',
    end_date: searchParams.get('end_date') || '',
  });

  // Sorting & Pagination state
  const [sort, setSort] = useState<string>(searchParams.get('sort') || 'timestamp');
  const [order, setOrder] = useState<string>(searchParams.get('order') || 'desc');
  const [page, setPage] = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize, setPageSize] = useState<number>(parseInt(searchParams.get('page_size') || '25', 10));

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Transaction for Drawer Detail View
  const selectedTxnId = searchParams.get('selected');
  const isDrawerOpen = Boolean(selectedTxnId);

  // Ingestion Modal state (from Section 05)
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestSuccess, setIngestSuccess] = useState<any | null>(null);

  const [formUserId, setFormUserId] = useState('USR-CUST-1001');
  const [formAmount, setFormAmount] = useState('150.00');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formMerchant, setFormMerchant] = useState('Amazon Web Retail');
  const [formCategory, setFormCategory] = useState('Electronics & Retail');
  const [formPaymentMethod, setFormPaymentMethod] = useState('CREDIT_CARD');
  const [formTransactionType, setFormTransactionType] = useState('PURCHASE');
  const [formDeviceId, setFormDeviceId] = useState('DEV-MACBOOK-01');
  const [formCity, setFormCity] = useState('London');
  const [formCountry, setFormCountry] = useState('GB');
  const [formLatitude, setFormLatitude] = useState('51.5074');
  const [formLongitude, setFormLongitude] = useState('-0.1278');
  const [formFailedAttempts, setFormFailedAttempts] = useState('0');
  const [formTxnId, setFormTxnId] = useState('');

  // Synchronize state changes to URL query parameters
  const updateUrlParams = useCallback(
    (newFilters: FilterValues, newSort: string, newOrder: string, newPage: number, newPageSize: number) => {
      const params = new URLSearchParams();
      if (newFilters.search) params.set('search', newFilters.search);
      if (newFilters.risk_level) params.set('risk_level', newFilters.risk_level);
      if (newFilters.status) params.set('status', newFilters.status);
      if (newFilters.currency) params.set('currency', newFilters.currency);
      if (newFilters.min_amount) params.set('min_amount', newFilters.min_amount);
      if (newFilters.max_amount) params.set('max_amount', newFilters.max_amount);
      if (newFilters.start_date) params.set('start_date', newFilters.start_date);
      if (newFilters.end_date) params.set('end_date', newFilters.end_date);

      if (newSort !== 'timestamp') params.set('sort', newSort);
      if (newOrder !== 'desc') params.set('order', newOrder);
      if (newPage > 1) params.set('page', String(newPage));
      if (newPageSize !== 25) params.set('page_size', String(newPageSize));

      if (selectedTxnId) params.set('selected', selectedTxnId);

      setSearchParams(params, { replace: true });
    },
    [selectedTxnId, setSearchParams]
  );

  // Fallback client-side filter, sort, and slice for offline/mock resiliency
  const getFilteredAndPaginatedMock = useCallback(() => {
    let filtered = [...MOCK_TRANSACTIONS];

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.user_id.toLowerCase().includes(q) ||
          (t.user_name && t.user_name.toLowerCase().includes(q)) ||
          t.merchant_name.toLowerCase().includes(q) ||
          (t.merchant_category && t.merchant_category.toLowerCase().includes(q)) ||
          (t.device_id && t.device_id.toLowerCase().includes(q)) ||
          (t.city && t.city.toLowerCase().includes(q))
      );
    }

    if (filters.risk_level) {
      filtered = filtered.filter((t) => t.risk_level === filters.risk_level);
    }

    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }

    if (filters.currency) {
      filtered = filtered.filter((t) => t.currency.toUpperCase() === filters.currency.toUpperCase());
    }

    if (filters.min_amount) {
      const min = parseFloat(filters.min_amount);
      if (!isNaN(min)) filtered = filtered.filter((t) => t.amount >= min);
    }

    if (filters.max_amount) {
      const max = parseFloat(filters.max_amount);
      if (!isNaN(max)) filtered = filtered.filter((t) => t.amount <= max);
    }

    if (filters.start_date) {
      const start = new Date(filters.start_date).getTime();
      filtered = filtered.filter((t) => new Date(t.timestamp).getTime() >= start);
    }

    if (filters.end_date) {
      const end = new Date(filters.end_date).getTime() + 86400000;
      filtered = filtered.filter((t) => new Date(t.timestamp).getTime() <= end);
    }

    filtered.sort((a, b) => {
      let valA: any = (a as any)[sort] ?? '';
      let valB: any = (b as any)[sort] ?? '';

      if (sort === 'timestamp' || sort === 'created_at') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    });

    const total = filtered.length;
    const calcPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), calcPages);
    const startIdx = (safePage - 1) * pageSize;
    const paginatedItems = filtered.slice(startIdx, startIdx + pageSize);

    return {
      items: paginatedItems,
      total,
      totalPages: calcPages,
    };
  }, [filters, sort, order, page, pageSize]);

  // Fetch transactions list
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort,
        order,
      });

      if (filters.search) queryParams.set('search', filters.search);
      if (filters.risk_level) queryParams.set('risk_level', filters.risk_level);
      if (filters.status) queryParams.set('status_filter', filters.status);
      if (filters.currency) queryParams.set('currency', filters.currency);
      if (filters.min_amount) queryParams.set('min_amount', filters.min_amount);
      if (filters.max_amount) queryParams.set('max_amount', filters.max_amount);
      if (filters.start_date) queryParams.set('start_date', filters.start_date);
      if (filters.end_date) queryParams.set('end_date', filters.end_date);

      const res = await apiClient.get<any>(`/transactions?${queryParams.toString()}`);
      
      if (res.data && Array.isArray(res.data.items)) {
        setTransactions(res.data.items);
        setTotalRecords(res.data.total ?? res.data.items.length);
        setTotalPages(res.data.total_pages ?? Math.max(1, Math.ceil((res.data.total ?? res.data.items.length) / pageSize)));
      } else if (Array.isArray(res.data)) {
        if (res.headers['x-total-count']) {
          setTransactions(res.data);
          const total = parseInt(res.headers['x-total-count'], 10);
          setTotalRecords(total);
          setTotalPages(res.headers['x-total-pages'] ? parseInt(res.headers['x-total-pages'], 10) : Math.max(1, Math.ceil(total / pageSize)));
        } else {
          const total = res.data.length;
          const calcPages = Math.max(1, Math.ceil(total / pageSize));
          const startIdx = (page - 1) * pageSize;
          setTransactions(res.data.slice(startIdx, startIdx + pageSize));
          setTotalRecords(total);
          setTotalPages(calcPages);
        }
      } else {
        const fallback = getFilteredAndPaginatedMock();
        setTransactions(fallback.items);
        setTotalRecords(fallback.total);
        setTotalPages(fallback.totalPages);
      }
    } catch (err: any) {
      console.warn('API error, using active mock transactions:', err);
      const fallback = getFilteredAndPaginatedMock();
      setTransactions(fallback.items);
      setTotalRecords(fallback.total);
      setTotalPages(fallback.totalPages);
    } finally {
      setIsLoading(false);
    }
  }, [filters, sort, order, page, pageSize, getFilteredAndPaginatedMock]);

  useEffect(() => {
    fetchTransactions();
    updateUrlParams(filters, sort, order, page, pageSize);
  }, [fetchTransactions, filters, sort, order, page, pageSize, updateUrlParams]);

  // Real-time live streaming transactions
  const { subscribeEvent } = useRealtime('all');
  useEffect(() => {
    const unsub = subscribeEvent<any>('transaction.created', (envelope) => {
      const p = envelope.payload;
      if (!p) return;

      const newTx: Transaction = {
        id: p.id || p.transaction_id || envelope.entity_id,
        user_id: p.user_id || 'UNKNOWN',
        user_name: p.user_name,
        amount: Number(p.amount) || 0,
        currency: p.currency || 'USD',
        merchant_name: p.merchant_name || 'Unknown Merchant',
        merchant_category: p.merchant_category || 'General',
        payment_method: p.payment_method || 'CARD',
        device_id: p.device_id || 'dev_unknown',
        failed_attempts: p.failed_attempts || 0,
        source: p.source || 'API',
        risk_score: Number(p.risk_score) || 0,
        risk_level: p.risk_level || 'LOW',
        ml_anomaly_score: Number(p.ml_anomaly_score) || 0,
        rules_triggered: p.rules_triggered || [],
        risk_factors: p.risk_factors || [],
        status: p.status || 'APPROVED',
        timestamp: p.timestamp || envelope.occurred_at,
        created_at: p.created_at || envelope.occurred_at,
      };

      const matchesRisk = !filters.risk_level || newTx.risk_level === filters.risk_level;
      const matchesStatus = !filters.status || newTx.status === filters.status;

      if (matchesRisk && matchesStatus && page === 1 && !filters.search) {
        setTransactions((prev) => [newTx, ...prev.slice(0, pageSize - 1)]);
        setTotalRecords((prev) => prev + 1);
      }
    });

    return () => unsub();
  }, [filters, page, pageSize, subscribeEvent]);

  // Filter Handlers
  const handleFilterChange = (partial: Partial<FilterValues>) => {
    const updated = { ...filters, ...partial };
    setFilters(updated);
    setPage(1);
  };

  const handleResetFilters = () => {
    const empty: FilterValues = {
      search: '',
      risk_level: '',
      status: '',
      currency: '',
      min_amount: '',
      max_amount: '',
      start_date: '',
      end_date: '',
    };
    setFilters(empty);
    setPage(1);
  };

  const handleSortChange = (column: string) => {
    if (sort === column) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(column);
      setOrder('desc');
    }
  };

  const handleSelectTransaction = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('selected', id);
    setSearchParams(params);
  };

  const handleCloseDrawer = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('selected');
    setSearchParams(params);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Timestamp',
      'User ID',
      'User Name',
      'Amount',
      'Currency',
      'Merchant',
      'Category',
      'Payment Method',
      'Risk Score',
      'Risk Level',
      'Status',
    ];
    const rows = transactions.map((t) => [
      t.id,
      t.timestamp,
      t.user_id,
      `"${t.user_name || ''}"`,
      t.amount,
      t.currency,
      `"${t.merchant_name}"`,
      t.merchant_category,
      t.payment_method,
      t.risk_score,
      t.risk_level,
      t.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Test Ingestion Submit
  const handleTestIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIngestError(null);
    setIngestSuccess(null);

    try {
      const payload: any = {
        user_id: formUserId.trim(),
        amount: parseFloat(formAmount),
        currency: formCurrency.trim().toUpperCase(),
        merchant_name: formMerchant.trim(),
        merchant_category: formCategory.trim(),
        payment_method: formPaymentMethod,
        transaction_type: formTransactionType,
        device_id: formDeviceId.trim(),
        city: formCity.trim(),
        country: formCountry.trim().toUpperCase(),
        failed_attempts: parseInt(formFailedAttempts, 10) || 0,
        source: 'API',
      };

      if (formTxnId.trim()) payload.transaction_id = formTxnId.trim();
      if (formLatitude) payload.latitude = parseFloat(formLatitude);
      if (formLongitude) payload.longitude = parseFloat(formLongitude);

      const res = await apiClient.post('/transactions', payload);
      setIngestSuccess(res.data);
      fetchTransactions();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Transaction ingestion failed';
      setIngestError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-soc-foreground tracking-tight flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-blue-400" />
            <span>Transaction Explorer</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </h1>
          <p className="text-xs text-soc-muted mt-1">
            Multidimensional exploration, filtering, rule explainability, and ML anomaly intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setShowIngestModal(true)}
            className="text-xs flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Ingest Test Txn</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>

          <button
            type="button"
            onClick={fetchTransactions}
            className="p-2 rounded-lg bg-soc-bg border border-soc-border hover:bg-slate-800 text-slate-300 transition-colors"
            title="Refresh Transactions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <TransactionFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        isLoading={isLoading}
      />

      {/* 3. Transaction Results Table */}
      <TransactionResultsTable
        transactions={transactions}
        selectedId={selectedTxnId}
        onSelectTransaction={handleSelectTransaction}
        sort={sort}
        order={order}
        onSortChange={handleSortChange}
        isLoading={isLoading}
        error={error}
        onRetry={fetchTransactions}
      />

      {/* 4. Pagination */}
      <TransactionPagination
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        onPageSizeChange={(newPageSize) => {
          setPageSize(newPageSize);
          setPage(1);
        }}
        isLoading={isLoading}
      />

      {/* 5. Investigation Detail Side Drawer */}
      <TransactionDetailDrawer
        transactionId={selectedTxnId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />

      {/* Test Ingestion Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-soc-card border border-soc-border rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-soc-border pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-blue-400" />
                  <span>Ingest Test Settlement Event</span>
                </h3>
                <p className="text-xs text-soc-muted mt-0.5">
                  Validates schema, calculates pure risk score, extracts features, and triggers rules.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowIngestModal(false);
                  setIngestError(null);
                  setIngestSuccess(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {ingestError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Ingestion Error: </span>
                  {ingestError}
                </div>
              </div>
            )}

            {ingestSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold">Ingested Successfully! </span>
                  <div>ID: {ingestSuccess.id} | Score: {ingestSuccess.risk_score} ({ingestSuccess.risk_level})</div>
                </div>
              </div>
            )}

            <form onSubmit={handleTestIngest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">User ID *</label>
                  <input
                    type="text"
                    required
                    value={formUserId}
                    onChange={(e) => setFormUserId(e.target.value)}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Transaction ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if blank"
                    value={formTxnId}
                    onChange={(e) => setFormTxnId(e.target.value)}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Currency *</label>
                  <input
                    type="text"
                    maxLength={3}
                    required
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Merchant Name *</label>
                  <input
                    type="text"
                    required
                    value={formMerchant}
                    onChange={(e) => setFormMerchant(e.target.value)}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Merchant Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Payment Method</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-white font-sans"
                  >
                    <option value="CREDIT_CARD">CREDIT_CARD</option>
                    <option value="DEBIT_CARD">DEBIT_CARD</option>
                    <option value="APPLE_PAY">APPLE_PAY</option>
                    <option value="GOOGLE_PAY">GOOGLE_PAY</option>
                    <option value="WIRE_TRANSFER">WIRE_TRANSFER</option>
                    <option value="CRYPTO">CRYPTO</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-semibold mb-1 block">Device ID *</label>
                  <input
                    type="text"
                    required
                    value={formDeviceId}
                    onChange={(e) => setFormDeviceId(e.target.value)}
                    className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIngestModal(false)}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Ingesting...' : 'Submit Transaction'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
