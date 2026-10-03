import React from 'react';
import { RefreshCw, Radio, Bell } from 'lucide-react';

interface AlertsHeaderProps {
  isLoading: boolean;
  totalAlerts: number;
  lastUpdated: string;
  isLive: boolean;
  onRefresh: () => void;
}

export const AlertsHeader: React.FC<AlertsHeaderProps> = ({
  isLoading,
  totalAlerts,
  lastUpdated,
  isLive,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-2xl shadow-sm">
      <div className="flex items-start gap-3.5">
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-soc-foreground tracking-tight">Alert Center</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold border ${
                isLive
                  ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30'
              }`}
            >
              <Radio className={`w-3 h-3 ${isLive ? 'animate-pulse' : ''}`} />
              {isLive ? 'Live Feed' : 'Connecting'}
            </span>
          </div>
          <p className="text-xs text-soc-muted mt-1">
            Real-time security alert queue, risk triage, automated deduplication, and investigation lifecycle.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-start md:self-auto">
        <div className="text-right hidden sm:block">
          <div className="text-[11px] font-mono text-soc-muted">Total Alerts</div>
          <div className="text-xs font-mono font-bold text-soc-foreground">{totalAlerts.toLocaleString()}</div>
        </div>

        <div className="h-7 w-px bg-soc-border hidden sm:block" />

        <div className="text-right hidden sm:block">
          <div className="text-[11px] font-mono text-soc-muted">Last Synced</div>
          <div className="text-xs font-mono font-bold text-soc-foreground">{lastUpdated}</div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2.5 rounded-xl bg-soc-surface border border-soc-border hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground transition-colors disabled:opacity-50 shadow-sm"
          title="Refresh Alerts"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
        </button>
      </div>
    </div>
  );
};
