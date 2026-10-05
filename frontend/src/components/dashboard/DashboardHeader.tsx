import React from 'react';
import { RefreshCw, Radio, Shield, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

export interface DashboardHeaderProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  connectionState: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';
  lastUpdated?: string | null;
}

const TIME_RANGES = [
  { label: 'Last 15m', value: '15m' },
  { label: 'Last 1h', value: '1h' },
  { label: 'Last 6h', value: '6h' },
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7d', value: '7d' },
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  timeRange,
  onTimeRangeChange,
  onRefresh,
  isRefreshing = false,
  connectionState,
  lastUpdated,
}) => {
  const getConnectionStatusPill = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs font-mono font-medium"
            title="Real-time WebSocket event channel established"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            <span>CONNECTED</span>
          </span>
        );
      case 'CONNECTING':
      case 'RECONNECTING':
        return (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-mono font-medium"
            title="Attempting WebSocket handshake"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span>RECONNECTING</span>
          </span>
        );
      case 'DISCONNECTED':
      case 'ERROR':
      default:
        return (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-soc-muted text-xs font-mono font-medium"
            title="WebSocket disconnected. Showing REST aggregate data."
          >
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span>DISCONNECTED</span>
          </span>
        );
    }
  };

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString()
    : 'Just now';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-xl">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-soc-foreground tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-soc-deepGreen dark:text-emerald-400" />
            <span>Security Overview</span>
          </h1>
          {getConnectionStatusPill()}
        </div>
        <p className="text-xs text-soc-muted mt-1">
          Real-time monitoring of transaction risk, anomaly detection, and operational defense.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Time Range Selector */}
        <div className="flex items-center rounded-lg bg-soc-bg border border-soc-border p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onTimeRangeChange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeRange === r.value
                  ? 'bg-soc-deepGreen text-white shadow-sm font-semibold'
                  : 'text-soc-muted hover:text-soc-foreground hover:bg-soc-lightGreen dark:hover:bg-soc-cardHover'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Refresh button & Last updated */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-soc-deepGreen dark:text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </Button>

          <div className="hidden sm:flex items-center gap-1 text-[11px] text-soc-muted font-mono pl-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
