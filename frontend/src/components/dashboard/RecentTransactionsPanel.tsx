import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ExternalLink, AlertCircle, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { RiskScoreBadge } from '../shared/RiskScoreBadge';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Transaction } from '../../types';

export interface RecentTransactionsPanelProps {
  transactions?: Transaction[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const RecentTransactionsPanel: React.FC<RecentTransactionsPanelProps> = ({
  transactions = [],
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BLOCKED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'REVIEW_REQUIRED':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'FLAGGED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'APPROVED':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-rose-500/30 flex flex-col justify-center items-center p-6 text-center">
        <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
        <h4 className="text-sm font-semibold text-soc-foreground">Failed to Load Transactions</h4>
        <p className="text-xs text-soc-muted mt-1">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 transition-colors"
          >
            Retry
          </button>
        )}
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <div>
              <CardTitle>Recent Ingested Transactions</CardTitle>
              <CardDescription>Latest evaluated settlement & authorization payloads</CardDescription>
            </div>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Transaction Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {transactions.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={Inbox}
              title="No Recent Transactions"
              description="Ingested transaction events will display here in real time."
            />
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-soc-bg/90 text-soc-muted uppercase font-semibold text-[10px] tracking-wider border-b border-soc-border/60">
                  <tr>
                    <th className="py-2.5 px-3">Txn ID</th>
                    <th className="py-2.5 px-3">User / Account</th>
                    <th className="py-2.5 px-3">Merchant</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Risk Assessment</th>
                    <th className="py-2.5 px-3">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border/40 font-mono">
                  {transactions.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/transactions/${t.id}`)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-blue-400">
                        {t.id.slice(0, 12)}...
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        {t.user_name || t.user_id}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">
                        {t.merchant_name}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-soc-foreground">
                        ${t.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3">
                        <RiskScoreBadge score={t.risk_score} level={t.risk_level} size="sm" />
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-sans font-semibold border ${getStatusBadge(
                            t.status
                          )}`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact Cards View */}
            <div className="sm:hidden space-y-2.5">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/transactions/${t.id}`)}
                  className="p-3 bg-soc-bg border border-soc-border/70 rounded-lg hover:border-slate-700 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono font-semibold text-blue-400">{t.id.slice(0, 10)}...</span>
                    <span className="font-bold text-soc-foreground">${t.amount.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-slate-300 mb-2">
                    {t.merchant_name} • <span className="text-soc-muted">{t.user_name || t.user_id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <RiskScoreBadge score={t.risk_score} level={t.risk_level} size="sm" />
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-sans font-semibold border ${getStatusBadge(
                        t.status
                      )}`}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
