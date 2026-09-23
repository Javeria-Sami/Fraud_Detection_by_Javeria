import React from 'react';
import { ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, Inbox } from 'lucide-react';
import { Transaction } from '../../types';
import { RiskScoreBadge } from '../shared/RiskScoreBadge';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

export interface TransactionResultsTableProps {
  transactions: Transaction[];
  selectedId: string | null;
  onSelectTransaction: (id: string) => void;
  sort: string;
  order: string;
  onSortChange: (column: string) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const TransactionResultsTable: React.FC<TransactionResultsTableProps> = ({
  transactions,
  selectedId,
  onSelectTransaction,
  sort,
  order,
  onSortChange,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const renderSortIcon = (column: string) => {
    if (sort !== column) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60" />;
    }
    return order.toLowerCase() === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-400" />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BLOCKED':
      case 'FAILED':
      case 'DECLINED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'REVIEW_REQUIRED':
      case 'FLAGGED':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'PENDING':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'APPROVED':
      case 'COMPLETED':
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden p-5 space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-soc-card border border-rose-500/30 rounded-xl p-8 flex flex-col items-center justify-center text-center">
        <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
        <h4 className="text-sm font-semibold text-soc-foreground">Failed to Load Transactions</h4>
        <p className="text-xs text-soc-muted mt-1 max-w-sm">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            Retry Query
          </button>
        )}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-soc-card border border-soc-border rounded-xl p-8">
        <EmptyState
          icon={Inbox}
          title="No Transactions Found"
          description="No financial transactions match your active search and filter criteria."
        />
      </div>
    );
  }

  return (
    <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden shadow-xl">
      {/* Desktop / Tablet Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-soc-bg/95 text-soc-muted uppercase font-semibold text-[10px] tracking-wider border-b border-soc-border select-none">
            <tr>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => onSortChange('timestamp')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Timestamp</span>
                  {renderSortIcon('timestamp')}
                </div>
              </th>
              <th className="py-3 px-4">Transaction ID</th>
              <th className="py-3 px-4">User / Account</th>
              <th className="py-3 px-4">Merchant</th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => onSortChange('amount')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Amount</span>
                  {renderSortIcon('amount')}
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => onSortChange('risk_score')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Risk Score</span>
                  {renderSortIcon('risk_score')}
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => onSortChange('status')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {renderSortIcon('status')}
                </div>
              </th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-border/50 font-mono">
            {transactions.map((t) => {
              const isSelected = selectedId === t.id;
              return (
                <tr
                  key={t.id}
                  onClick={() => onSelectTransaction(t.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-600/15 border-l-2 border-l-blue-500'
                      : 'hover:bg-slate-800/60'
                  }`}
                >
                  <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                    {t.timestamp ? new Date(t.timestamp).toLocaleString() : '-'}
                  </td>
                  <td className="py-3 px-4 font-bold text-blue-400">
                    {t.id}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-200">
                    <div className="font-medium">{t.user_name || t.user_id}</div>
                    <div className="text-[10px] text-soc-muted font-mono">{t.user_id}</div>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-300">
                    <div>{t.merchant_name}</div>
                    <div className="text-[10px] text-soc-muted uppercase font-mono">
                      {t.merchant_category}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-white text-sm">
                    ${t.amount.toFixed(2)}{' '}
                    <span className="text-[10px] text-soc-muted font-sans font-normal">
                      {t.currency}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <RiskScoreBadge score={t.risk_score} level={t.risk_level} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-sans font-semibold border ${getStatusBadge(
                        t.status
                      )}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTransaction(t.id);
                      }}
                      className="p-1.5 rounded-lg bg-soc-bg border border-soc-border hover:bg-blue-600 hover:text-white text-slate-400 transition-all"
                      title="Inspect Transaction"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Compact Cards View */}
      <div className="md:hidden divide-y divide-soc-border/60">
        {transactions.map((t) => {
          const isSelected = selectedId === t.id;
          return (
            <div
              key={t.id}
              onClick={() => onSelectTransaction(t.id)}
              className={`p-4 space-y-2 cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-600/15' : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-blue-400">{t.id}</span>
                <span className="font-bold text-white font-mono text-sm">
                  ${t.amount.toFixed(2)} {t.currency}
                </span>
              </div>

              <div className="text-xs text-slate-300">
                <span className="font-medium">{t.merchant_name}</span> •{' '}
                <span className="text-soc-muted">{t.user_name || t.user_id}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <RiskScoreBadge score={t.risk_score} level={t.risk_level} size="sm" />
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-sans font-semibold border ${getStatusBadge(
                      t.status
                    )}`}
                  >
                    {t.status}
                  </span>
                </div>
                <span className="text-[10px] text-soc-muted font-mono">
                  {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
