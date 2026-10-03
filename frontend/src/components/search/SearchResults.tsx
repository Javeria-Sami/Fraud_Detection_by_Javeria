import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Bell,
  Briefcase,
  User,
  Smartphone,
  Store,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  SearchX,
} from 'lucide-react';
import {
  SearchResponse,
  TransactionSearchResult,
  AlertSearchResult,
  CaseSearchResult,
  UserSearchResult,
  DeviceSearchResult,
  MerchantSearchResult,
} from '../../types';

interface SearchResultsProps {
  data: SearchResponse | null;
  activeTab: 'all' | 'transactions' | 'alerts' | 'cases' | 'users' | 'devices' | 'merchants';
  onTabChange: (tab: 'all' | 'transactions' | 'alerts' | 'cases' | 'users' | 'devices' | 'merchants') => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  data,
  activeTab,
  onTabChange,
  currentPage,
  onPageChange,
  isLoading,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-soc-card rounded-xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-soc-card rounded-2xl border border-soc-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.total_results === 0) {
    return (
      <div className="bg-soc-card border border-soc-border rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm">
        <div className="w-16 h-16 bg-soc-surface rounded-2xl flex items-center justify-center mx-auto mb-4 border border-soc-border">
          <SearchX className="w-8 h-8 text-soc-muted" />
        </div>
        <h3 className="text-lg font-bold text-soc-foreground mb-1">No Historical Records Found</h3>
        <p className="text-sm text-soc-muted mb-6">
          No records match your query and filter criteria across transactions, alerts, cases, or profiles.
        </p>
        <div className="bg-soc-surface p-4 rounded-xl border border-soc-border text-left text-xs text-soc-muted space-y-1.5">
          <span className="font-semibold text-soc-foreground block mb-1">Search recommendations:</span>
          <p>• Verify exact identifier spelling (e.g. <code className="text-blue-500 font-bold">TXN-001</code>, <code className="text-amber-500 font-bold">ALR-001</code>, <code className="text-purple-500 font-bold">CASE-001</code>).</p>
          <p>• Widen or clear the date range boundary in Advanced Filters.</p>
          <p>• Lower the minimum risk threshold or enable all entity types.</p>
        </div>
      </div>
    );
  }

  const counts = data.counts || data.counts_by_category || {
    transactions: 0,
    alerts: 0,
    cases: 0,
    users: 0,
    devices: 0,
    merchants: 0,
    total: 0,
  };

  const totalResults = data.total_results ?? counts.total ?? 0;
  const executionTime = data.execution_time_ms ?? 0;

  const renderRiskBadge = (score: number, level?: string) => {
    let color = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    let icon = <ShieldCheck className="w-3 h-3" />;

    if (score >= 85 || level === 'CRITICAL') {
      color = 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      icon = <Flame className="w-3 h-3" />;
    } else if (score >= 60 || level === 'HIGH') {
      color = 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30';
      icon = <AlertTriangle className="w-3 h-3" />;
    } else if (score >= 30 || level === 'MEDIUM') {
      color = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${color}`}>
        {icon}
        {score} / 100 {level ? `(${level})` : ''}
      </span>
    );
  };

  const tabs: { key: SearchResultsProps['activeTab']; label: string; count: number }[] = [
    { key: 'all', label: 'All Results', count: totalResults },
    { key: 'transactions', label: 'Transactions', count: counts.transactions || 0 },
    { key: 'alerts', label: 'Alerts', count: counts.alerts || 0 },
    { key: 'cases', label: 'Cases', count: counts.cases || 0 },
    { key: 'users', label: 'Users', count: counts.users || 0 },
    { key: 'devices', label: 'Devices', count: counts.devices || 0 },
    { key: 'merchants', label: 'Merchants', count: counts.merchants || 0 },
  ];

  const transactions = data.transactions?.items || [];
  const alerts = data.alerts?.items || [];
  const cases = data.cases?.items || [];
  const users = data.users?.items || [];
  const devices = data.devices?.items || [];
  const merchants = data.merchants?.items || [];

  return (
    <div className="space-y-4">
      {/* Category Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soc-border pb-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-soc-muted hover:text-soc-foreground hover:bg-soc-surface border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-soc-surface text-soc-muted border border-soc-border'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-soc-muted font-mono">
          Found <span className="font-bold text-soc-foreground">{totalResults}</span> results in{' '}
          <span className="text-blue-600 dark:text-blue-400 font-bold">{executionTime.toFixed(1)}ms</span>
        </div>
      </div>

      {/* Results Content */}
      <div className="space-y-6">
        {/* Transactions Section */}
        {(activeTab === 'all' || activeTab === 'transactions') && transactions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-soc-muted flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Transactions ({data.transactions?.total || transactions.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {transactions.map((txn: TransactionSearchResult) => (
                <div
                  key={txn.id}
                  onClick={() => navigate(`/transactions/${txn.id}`)}
                  className="bg-soc-card border border-soc-border hover:border-emerald-400 hover:bg-soc-surface rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:underline">
                        {txn.id}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-soc-surface border border-soc-border text-soc-muted rounded">
                        {txn.status}
                      </span>
                    </div>

                    <div className="text-lg font-bold text-soc-foreground mb-1 font-mono">
                      {txn.currency} {txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>

                    <div className="space-y-1 text-xs text-soc-muted mb-3">
                      {txn.merchant_name && <div>Merchant: <span className="text-soc-foreground font-medium">{txn.merchant_name}</span></div>}
                      {txn.user_id && <div>User ID: <span className="text-soc-foreground font-mono">{txn.user_id}</span></div>}
                      {(txn.city || txn.country) && (
                        <div>Location: <span className="text-soc-foreground">{[txn.city, txn.country].filter(Boolean).join(', ')}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-soc-border flex items-center justify-between text-xs">
                    <div>{renderRiskBadge(txn.risk_score, txn.risk_level)}</div>
                    <div className="flex items-center gap-1 text-soc-muted group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                      <span className="text-[11px]">View Detail</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts Section */}
        {(activeTab === 'all' || activeTab === 'alerts') && alerts.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-soc-muted flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              Alerts ({data.alerts?.total || alerts.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alerts.map((alr: AlertSearchResult) => (
                <div
                  key={alr.id}
                  onClick={() => navigate(`/alerts/${alr.id}`)}
                  className="bg-soc-card border border-soc-border hover:border-amber-400 hover:bg-soc-surface rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:underline">
                        {alr.id}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-soc-surface border border-soc-border text-soc-muted rounded">
                        {alr.status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-soc-foreground mb-2 line-clamp-2">
                      {alr.title}
                    </div>

                    <div className="space-y-1 text-xs text-soc-muted mb-3">
                      {alr.transaction_id && <div>Txn ID: <span className="text-soc-foreground font-mono">{alr.transaction_id}</span></div>}
                      {alr.assigned_to && <div>Assigned: <span className="text-soc-foreground font-medium">{alr.assigned_to}</span></div>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-soc-border flex items-center justify-between text-xs">
                    <div>{renderRiskBadge(alr.risk_score, alr.severity)}</div>
                    <div className="flex items-center gap-1 text-soc-muted group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                      <span className="text-[11px]">View Alert</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cases Section */}
        {(activeTab === 'all' || activeTab === 'cases') && cases.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-soc-muted flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-500" />
              Investigation Cases ({data.cases?.total || cases.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cases.map((c: CaseSearchResult) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="bg-soc-card border border-soc-border hover:border-purple-400 hover:bg-soc-surface rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:underline">
                        {c.id}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-soc-surface border border-soc-border text-soc-muted rounded">
                        {c.status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-soc-foreground mb-2 line-clamp-2">
                      {c.title}
                    </div>

                    <div className="space-y-1 text-xs text-soc-muted mb-3">
                      {c.assigned_to && <div>Lead: <span className="text-soc-foreground font-medium">{c.assigned_to}</span></div>}
                      {c.user_id && <div>Target User: <span className="text-soc-foreground font-mono">{c.user_id}</span></div>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-soc-border flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 text-[11px] font-bold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 rounded">
                      {c.severity}
                    </span>
                    <div className="flex items-center gap-1 text-soc-muted group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                      <span className="text-[11px]">Open Case</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Section */}
        {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-soc-muted flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              Users ({data.users?.total || users.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {users.map((u: UserSearchResult) => (
                <div
                  key={u.user_id}
                  onClick={() => navigate(`/risk-profiles?tab=users&id=${u.user_id}`)}
                  className="bg-soc-card border border-soc-border hover:border-blue-400 hover:bg-soc-surface rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                        {u.user_id}
                      </div>
                    </div>

                    <div className="text-sm font-bold text-soc-foreground mb-1">
                      {u.full_name || u.user_id}
                    </div>
                    {u.email && <div className="text-xs text-soc-muted mb-3">{u.email}</div>}

                    <div className="grid grid-cols-2 gap-2 text-xs text-soc-muted mb-3 bg-soc-surface p-2.5 rounded-xl border border-soc-border">
                      <div>Total Txns: <span className="font-bold text-soc-foreground font-mono">{u.total_transactions}</span></div>
                      <div>Flagged: <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{u.flagged_transactions}</span></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-soc-border flex items-center justify-between text-xs">
                    <div>{renderRiskBadge(u.risk_score, u.risk_level)}</div>
                    <div className="flex items-center gap-1 text-soc-muted group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                      <span className="text-[11px]">Risk Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Devices Section */}
        {(activeTab === 'all' || activeTab === 'devices') && devices.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-soc-muted flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-500" />
              Devices ({data.devices?.total || devices.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {devices.map((d: DeviceSearchResult) => (
                <div
                  key={d.device_id}
                  onClick={() => navigate(`/risk-profiles?tab=devices&id=${d.device_id}`)}
                  className="bg-soc-card border border-soc-border hover:border-indigo-400 hover:bg-soc-surface rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline mb-2 truncate">
                      {d.device_id}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-soc-muted mb-3 bg-soc-surface p-2.5 rounded-xl border border-soc-border">
                      <div>Users Linked: <span className="font-bold text-soc-foreground font-mono">{d.distinct_users_count}</span></div>
                      <div>Total Txns: <span className="font-bold text-soc-foreground font-mono">{d.total_transactions}</span></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-soc-border flex items-center justify-between text-xs">
                    <div>{renderRiskBadge(d.risk_score, d.risk_level)}</div>
                    <div className="flex items-center gap-1 text-soc-muted group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                      <span className="text-[11px]">Device Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Merchants Section */}
        {(activeTab === 'all' || activeTab === 'merchants') && merchants.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-soc-muted flex items-center gap-2">
              <Store className="w-4 h-4 text-rose-500" />
              Merchants ({data.merchants?.total || merchants.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {merchants.map((m: MerchantSearchResult) => (
                <div
                  key={m.merchant_id}
                  onClick={() => navigate(`/risk-profiles?tab=merchants&id=${m.merchant_id}`)}
                  className="bg-soc-card border border-soc-border hover:border-rose-400 hover:bg-soc-surface rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:underline mb-1">
                      {m.merchant_id}
                    </div>

                    <div className="text-sm font-bold text-soc-foreground mb-1">
                      {m.merchant_name}
                    </div>
                    {m.merchant_category && (
                      <div className="text-xs text-soc-muted mb-3">{m.merchant_category}</div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-soc-muted mb-3 bg-soc-surface p-2.5 rounded-xl border border-soc-border">
                      <div>Total Txns: <span className="font-bold text-soc-foreground font-mono">{m.total_transactions}</span></div>
                      <div>Failed: <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{m.failed_transactions}</span></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-soc-border flex items-center justify-between text-xs">
                    <div>{renderRiskBadge(m.risk_score, m.risk_level)}</div>
                    <div className="flex items-center gap-1 text-soc-muted group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                      <span className="text-[11px]">Merchant Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination Controls for Entity View */}
      {activeTab !== 'all' && (() => {
        const totalPages =
          activeTab === 'transactions'
            ? (data.transactions?.total_pages ?? 1)
            : activeTab === 'alerts'
            ? (data.alerts?.total_pages ?? 1)
            : activeTab === 'cases'
            ? (data.cases?.total_pages ?? 1)
            : activeTab === 'users'
            ? (data.users?.total_pages ?? 1)
            : activeTab === 'devices'
            ? (data.devices?.total_pages ?? 1)
            : (data.merchants?.total_pages ?? 1);

        const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
          Math.max(0, currentPage - 3),
          Math.min(totalPages, currentPage + 2)
        );

        return (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-soc-border text-xs">
            <span className="text-xs text-soc-muted font-mono">
              Page <strong className="text-soc-foreground font-bold">{currentPage}</strong> of <strong className="text-soc-foreground font-bold">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 bg-soc-surface hover:bg-soc-card disabled:opacity-40 text-soc-foreground border border-soc-border rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((pNum) => (
                  <button
                    key={`search-page-${pNum}`}
                    type="button"
                    onClick={() => onPageChange(pNum)}
                    className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg border font-mono text-xs transition-all ${
                      currentPage === pNum
                        ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm'
                        : 'bg-soc-surface border-soc-border text-soc-muted hover:text-soc-foreground hover:bg-soc-card'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 bg-soc-surface hover:bg-soc-card disabled:opacity-40 text-soc-foreground border border-soc-border rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
