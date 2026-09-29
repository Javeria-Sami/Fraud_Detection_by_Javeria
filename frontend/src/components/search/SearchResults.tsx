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
        <div className="h-10 bg-slate-800/60 rounded-xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-slate-800/40 rounded-xl border border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.total_results === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-xl">
        <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
          <SearchX className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-100 mb-1">No Historical Records Found</h3>
        <p className="text-sm text-slate-400 mb-6">
          No records match your query and filter criteria across transactions, alerts, cases, or profiles.
        </p>
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-left text-xs text-slate-400 space-y-1.5">
          <span className="font-semibold text-slate-300 block mb-1">Search recommendations:</span>
          <p>• Verify exact identifier spelling (e.g. <code className="text-cyan-400">TXN-001</code>, <code className="text-amber-400">ALR-001</code>, <code className="text-purple-400">CASE-001</code>).</p>
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
    let color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    let icon = <ShieldCheck className="w-3 h-3" />;

    if (score >= 85 || level === 'CRITICAL') {
      color = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      icon = <Flame className="w-3 h-3" />;
    } else if (score >= 60 || level === 'HIGH') {
      color = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      icon = <AlertTriangle className="w-3 h-3" />;
    } else if (score >= 30 || level === 'MEDIUM') {
      color = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
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
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Found <span className="font-bold text-slate-200">{totalResults}</span> results in{' '}
          <span className="text-cyan-400">{executionTime.toFixed(1)}ms</span>
        </div>
      </div>

      {/* Results Content */}
      <div className="space-y-6">
        {/* Transactions Section */}
        {(activeTab === 'all' || activeTab === 'transactions') && transactions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Transactions ({data.transactions?.total || transactions.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {transactions.map((txn: TransactionSearchResult) => (
                <div
                  key={txn.id}
                  onClick={() => navigate(`/transactions/${txn.id}`)}
                  className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-emerald-950/20 cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                        {txn.id}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-slate-800 border border-slate-700 text-slate-300 rounded">
                        {txn.status}
                      </span>
                    </div>

                    <div className="text-lg font-bold text-slate-100 mb-1 font-mono">
                      {txn.currency} {txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>

                    <div className="space-y-1 text-xs text-slate-400 mb-3">
                      {txn.merchant_name && <div>Merchant: <span className="text-slate-200">{txn.merchant_name}</span></div>}
                      {txn.user_id && <div>User ID: <span className="text-slate-300 font-mono">{txn.user_id}</span></div>}
                      {(txn.city || txn.country) && (
                        <div>Location: <span className="text-slate-300">{[txn.city, txn.country].filter(Boolean).join(', ')}</span></div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>{renderRiskBadge(txn.risk_score, txn.risk_level)}</div>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-cyan-400 transition-colors">
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Alerts ({data.alerts?.total || alerts.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alerts.map((alr: AlertSearchResult) => (
                <div
                  key={alr.id}
                  onClick={() => navigate(`/alerts/${alr.id}`)}
                  className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-amber-950/20 cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-xs font-bold text-amber-400 group-hover:text-amber-300">
                        {alr.id}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-slate-800 border border-slate-700 text-slate-300 rounded">
                        {alr.status}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-100 mb-2 line-clamp-2">
                      {alr.title}
                    </div>

                    <div className="space-y-1 text-xs text-slate-400 mb-3">
                      {alr.transaction_id && <div>Txn ID: <span className="text-slate-300 font-mono">{alr.transaction_id}</span></div>}
                      {alr.assigned_to && <div>Assigned: <span className="text-slate-300">{alr.assigned_to}</span></div>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>{renderRiskBadge(alr.risk_score, alr.severity)}</div>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-cyan-400 transition-colors">
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-400" />
              Investigation Cases ({data.cases?.total || cases.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cases.map((c: CaseSearchResult) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-purple-950/20 cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-xs font-bold text-purple-400 group-hover:text-purple-300">
                        {c.id}
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-slate-800 border border-slate-700 text-slate-300 rounded">
                        {c.status}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-100 mb-2 line-clamp-2">
                      {c.title}
                    </div>

                    <div className="space-y-1 text-xs text-slate-400 mb-3">
                      {c.assigned_to && <div>Lead: <span className="text-slate-300">{c.assigned_to}</span></div>}
                      {c.user_id && <div>Target User: <span className="text-slate-300 font-mono">{c.user_id}</span></div>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 text-[11px] font-bold uppercase bg-purple-950/40 text-purple-300 border border-purple-800/40 rounded">
                      {c.severity}
                    </span>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-cyan-400 transition-colors">
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              Users ({data.users?.total || users.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {users.map((u: UserSearchResult) => (
                <div
                  key={u.user_id}
                  onClick={() => navigate(`/risk-profiles?tab=users&id=${u.user_id}`)}
                  className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-blue-950/20 cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-mono text-xs font-bold text-blue-400 group-hover:text-blue-300">
                        {u.user_id}
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-slate-100 mb-1">
                      {u.full_name || u.user_id}
                    </div>
                    {u.email && <div className="text-xs text-slate-400 mb-3">{u.email}</div>}

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                      <div>Total Txns: <span className="font-bold text-slate-200">{u.total_transactions}</span></div>
                      <div>Flagged: <span className="font-bold text-rose-400">{u.flagged_transactions}</span></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>{renderRiskBadge(u.risk_score, u.risk_level)}</div>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-cyan-400 transition-colors">
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              Devices ({data.devices?.total || devices.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {devices.map((d: DeviceSearchResult) => (
                <div
                  key={d.device_id}
                  onClick={() => navigate(`/risk-profiles?tab=devices&id=${d.device_id}`)}
                  className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-indigo-950/20 cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-indigo-400 group-hover:text-indigo-300 mb-2 truncate">
                      {d.device_id}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                      <div>Users Linked: <span className="font-bold text-slate-200">{d.distinct_users_count}</span></div>
                      <div>Total Txns: <span className="font-bold text-slate-200">{d.total_transactions}</span></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>{renderRiskBadge(d.risk_score, d.risk_level)}</div>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-cyan-400 transition-colors">
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Store className="w-4 h-4 text-rose-400" />
              Merchants ({data.merchants?.total || merchants.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {merchants.map((m: MerchantSearchResult) => (
                <div
                  key={m.merchant_id}
                  onClick={() => navigate(`/risk-profiles?tab=merchants&id=${m.merchant_id}`)}
                  className="bg-slate-900/80 border border-slate-800 hover:border-rose-500/50 rounded-xl p-4 transition-all hover:shadow-lg hover:shadow-rose-950/20 cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-rose-400 group-hover:text-rose-300 mb-1">
                      {m.merchant_id}
                    </div>

                    <div className="text-sm font-semibold text-slate-100 mb-1">
                      {m.merchant_name}
                    </div>
                    {m.merchant_category && (
                      <div className="text-xs text-slate-400 mb-3">{m.merchant_category}</div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3 bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                      <div>Total Txns: <span className="font-bold text-slate-200">{m.total_transactions}</span></div>
                      <div>Failed: <span className="font-bold text-rose-400">{m.failed_transactions}</span></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>{renderRiskBadge(m.risk_score, m.risk_level)}</div>
                    <div className="flex items-center gap-1 text-slate-400 group-hover:text-cyan-400 transition-colors">
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
      {activeTab !== 'all' && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-xs text-slate-400 font-mono">
            Page {currentPage}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={
              activeTab === 'transactions'
                ? currentPage >= (data.transactions?.total_pages ?? 1)
                : activeTab === 'alerts'
                ? currentPage >= (data.alerts?.total_pages ?? 1)
                : activeTab === 'cases'
                ? currentPage >= (data.cases?.total_pages ?? 1)
                : activeTab === 'users'
                ? currentPage >= (data.users?.total_pages ?? 1)
                : activeTab === 'devices'
                ? currentPage >= (data.devices?.total_pages ?? 1)
                : currentPage >= (data.merchants?.total_pages ?? 1)
            }
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
