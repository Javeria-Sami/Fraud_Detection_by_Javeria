import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Case } from '../../types';
import { SeverityBadge } from '../shared/SeverityBadge';
import {
  FolderLock,
  ChevronRight,
  ShieldAlert,
  Clock,
  User,
  ArrowUpDown,
  Bell,
  CreditCard,
  FileCheck2,
} from 'lucide-react';

interface CasesTableProps {
  cases: Case[];
  isLoading: boolean;
  sortBy: string;
  order: string;
  onSort: (column: string) => void;
  onQuickAssign?: (caseId: string) => void;
}

export const CasesTable: React.FC<CasesTableProps> = ({
  cases,
  isLoading,
  sortBy,
  order,
  onSort,
}) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            OPEN
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            INVESTIGATING
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            PENDING
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            RESOLVED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            CLOSED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading && cases.length === 0) {
    return (
      <div className="bg-soc-card border border-soc-border rounded-xl p-8 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-slate-800/40 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!isLoading && cases.length === 0) {
    return (
      <div className="bg-soc-card border border-soc-border rounded-xl p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <FolderLock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">No Investigation Cases Found</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          No cases match your selected filter criteria. Try broadening your search or creating a new case.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-soc-card border border-soc-border rounded-xl overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-soc-border bg-soc-bg text-soc-muted font-semibold select-none">
              <th
                onClick={() => onSort('case_id')}
                className="py-3 px-4 cursor-pointer hover:text-soc-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Case ID & Title</span>
                  <ArrowUpDown className="w-3 h-3 text-soc-muted" />
                </div>
              </th>
              <th
                onClick={() => onSort('severity')}
                className="py-3 px-4 cursor-pointer hover:text-soc-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Severity</span>
                  <ArrowUpDown className="w-3 h-3 text-soc-muted" />
                </div>
              </th>
              <th
                onClick={() => onSort('status')}
                className="py-3 px-4 cursor-pointer hover:text-soc-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-soc-muted" />
                </div>
              </th>
              <th className="py-3 px-4">Subject User</th>
              <th className="py-3 px-4">Linked Evidence</th>
              <th className="py-3 px-4">Assigned Analyst</th>
              <th
                onClick={() => onSort('created_at')}
                className="py-3 px-4 cursor-pointer hover:text-soc-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Created</span>
                  <ArrowUpDown className="w-3 h-3 text-soc-muted" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-soc-border/60">
            {cases.map((c) => {
              const alertsCount = c.alerts_count ?? (c.related_alert_ids?.length || 0);
              const txnsCount = c.transactions_count ?? (c.related_transaction_ids?.length || 0);

              return (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="hover:bg-soc-cardHover transition-colors cursor-pointer group"
                >
                  {/* Case ID & Title */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 mt-0.5">
                        <FolderLock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-indigo-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                          {c.id}
                        </div>
                        <div className="text-soc-foreground font-medium line-clamp-1 mt-0.5">
                          {c.title}
                        </div>
                        {c.resolution && (
                          <div className="text-[11px] text-emerald-500 flex items-center gap-1 mt-0.5">
                            <FileCheck2 className="w-3 h-3" />
                            <span>{c.resolution}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Severity */}
                  <td className="py-3.5 px-4">
                    <SeverityBadge severity={c.severity} />
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(c.status)}
                  </td>

                  {/* Subject User */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-soc-foreground">
                      <User className="w-3.5 h-3.5 text-soc-muted" />
                      <span className="font-mono">{c.user_id || '—'}</span>
                    </div>
                  </td>

                  {/* Linked Evidence Counts */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono ${
                          alertsCount > 0
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-soc-surface text-soc-muted border border-soc-border'
                        }`}
                        title={`${alertsCount} linked alerts`}
                      >
                        <Bell className="w-3 h-3" />
                        <span>{alertsCount}</span>
                      </div>

                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono ${
                          txnsCount > 0
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            : 'bg-soc-surface text-soc-muted border border-soc-border'
                        }`}
                        title={`${txnsCount} linked transactions`}
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>{txnsCount}</span>
                      </div>
                    </div>
                  </td>

                  {/* Assigned Analyst */}
                  <td className="py-3.5 px-4">
                    <div className="text-soc-foreground font-medium">
                      {c.assigned_analyst ? (
                        <span className="text-indigo-500 dark:text-indigo-300 font-mono text-[11px]">
                          {c.assigned_analyst}
                        </span>
                      ) : (
                        <span className="text-amber-500/80 font-mono text-[11px] italic">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Created At */}
                  <td className="py-3.5 px-4 text-soc-muted whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-soc-muted" />
                      <span>{formatDateTime(c.created_at)}</span>
                    </div>
                  </td>

                  {/* Action Link */}
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/cases/${c.id}`);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-soc-surface hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground transition-colors border border-soc-border"
                    >
                      <span>Investigate</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
