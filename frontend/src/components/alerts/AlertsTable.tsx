import React from 'react';
import { Alert } from '../../types';
import { SeverityBadge } from '../shared/SeverityBadge';
import { RiskScoreBadge } from '../shared/RiskScoreBadge';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
  User,
  Clock,
  SearchX,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AlertsTableProps {
  alerts: Alert[];
  isLoading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onSelectAlert: (alertId: string) => void;
  selectedAlertId: string | null;
  onResetFilters: () => void;
}

export const AlertsTable: React.FC<AlertsTableProps> = ({
  alerts,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onSelectAlert,
  selectedAlertId,
  onResetFilters,
}) => {
  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 transition-colors" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
    );
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'NEW':
      case 'OPEN':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse';
      case 'ACKNOWLEDGED':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'INVESTIGATING':
      case 'IN_PROGRESS':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'RESOLVED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'DISMISSED':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      case 'ESCALATED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold';
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  if (isLoading && alerts.length === 0) {
    return (
      <div className="bg-soc-card border border-soc-border rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-soc-border/60">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800" />
                <div className="space-y-1.5">
                  <div className="h-4 w-28 bg-slate-700 rounded" />
                  <div className="h-3 w-48 bg-slate-800 rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-slate-800 rounded-full" />
              <div className="h-6 w-16 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-soc-card border border-soc-border rounded-2xl p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-soc-bg border border-soc-border flex items-center justify-center mx-auto mb-3 text-slate-400">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-white mb-1">No alerts match your criteria</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Try expanding your date range, adjusting severity tiers, or resetting search filters.
        </p>
        <button
          onClick={onResetFilters}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
        >
          Reset All Filters
        </button>
      </div>
    );
  }

  return (
    <div className="bg-soc-card border border-soc-border rounded-2xl overflow-hidden shadow-sm">
      {/* Desktop / Tablet Data Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-soc-bg/80 border-b border-soc-border text-slate-400 font-mono uppercase tracking-wider text-[10px]">
            <tr>
              <th
                onClick={() => onSort('created_at')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Timestamp</span>
                  {renderSortIcon('created_at')}
                </div>
              </th>

              <th className="py-3 px-4">Alert ID / Reason</th>

              <th
                onClick={() => onSort('severity')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Severity</span>
                  {renderSortIcon('severity')}
                </div>
              </th>

              <th
                onClick={() => onSort('risk_score')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Risk Score</span>
                  {renderSortIcon('risk_score')}
                </div>
              </th>

              <th className="py-3 px-4">Related Txn</th>

              <th
                onClick={() => onSort('status')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </div>
              </th>

              <th className="py-3 px-4">Assigned Analyst</th>

              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-soc-border/60">
            {alerts.map((alert) => {
              const isSelected = selectedAlertId === alert.id;
              return (
                <tr
                  key={alert.id}
                  onClick={() => onSelectAlert(alert.id)}
                  className={`cursor-pointer transition-colors group ${
                    isSelected ? 'bg-blue-600/10 hover:bg-blue-600/15' : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Timestamp */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {alert.created_at
                      ? new Date(alert.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : '—'}
                  </td>

                  {/* ID & Reason */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-mono font-bold text-white text-xs group-hover:text-blue-400 transition-colors">
                      {alert.id}
                    </div>
                    <p className="text-slate-400 text-[11px] truncate mt-0.5">
                      {alert.alert_reason || alert.title || 'Anomaly Detection Triggered'}
                    </p>
                  </td>

                  {/* Severity */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <SeverityBadge severity={alert.severity} size="sm" />
                  </td>

                  {/* Risk Score */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <RiskScoreBadge score={alert.risk_score} size="sm" showLevel={false} />
                  </td>

                  {/* Related Transaction Link */}
                  <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap">
                    <Link
                      to={`/transactions/${alert.transaction_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      <span>{alert.transaction_id}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${getStatusBadgeClass(
                        alert.status
                      )}`}
                    >
                      {alert.status}
                    </span>
                  </td>

                  {/* Assigned Analyst */}
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                    {alert.assigned_to ? (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{alert.assigned_to}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAlert(alert.id);
                      }}
                      className="p-1.5 rounded-lg bg-soc-bg border border-soc-border hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Investigate Alert"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden divide-y divide-soc-border/60">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            onClick={() => onSelectAlert(alert.id)}
            className="p-4 space-y-2.5 cursor-pointer active:bg-slate-800/40"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-white text-xs">{alert.id}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold border ${getStatusBadgeClass(
                  alert.status
                )}`}
              >
                {alert.status}
              </span>
            </div>

            <p className="text-xs text-slate-300 font-medium">
              {alert.alert_reason || alert.title || 'Security Anomaly Detected'}
            </p>

            <div className="flex items-center justify-between text-[11px] font-mono pt-1">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={alert.severity} size="sm" />
                <RiskScoreBadge score={alert.risk_score} size="sm" showLevel={false} />
              </div>
              <span className="text-slate-400">
                {alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
