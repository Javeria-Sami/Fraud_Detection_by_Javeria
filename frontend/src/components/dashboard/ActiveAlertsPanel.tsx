import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { SeverityBadge } from '../shared/SeverityBadge';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Alert } from '../../types';

export interface ActiveAlertsPanelProps {
  alerts?: Alert[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const ActiveAlertsPanel: React.FC<ActiveAlertsPanelProps> = ({
  alerts = [],
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col justify-between">
        <CardHeader>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-rose-500/30 flex flex-col justify-center items-center p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
        <h4 className="text-sm font-semibold text-soc-foreground">Failed to Load Alerts</h4>
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
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <div>
              <CardTitle>Active Alert Queue</CardTitle>
              <CardDescription>Prioritized critical and high severity triage</CardDescription>
            </div>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Alert Center</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {alerts.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={CheckCircle2}
              title="No Pending Critical Alerts"
              description="All active security threats and anomalies have been addressed."
            />
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {alerts.map((a) => {
              const isCritical = a.severity === 'CRITICAL';
              return (
                <div
                  key={a.id}
                  onClick={() => navigate('/alerts')}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/70 hover:bg-rose-950/30'
                      : 'bg-soc-bg border-soc-border/80 hover:border-amber-500/50 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={a.severity} size="sm" />
                      <span className="text-[11px] font-mono text-soc-muted">
                        TX: {a.transaction_id.slice(0, 10)}...
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-soc-foreground">
                      Score: {a.risk_score.toFixed(0)}/100
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                    {a.alert_reason}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-soc-border/40 text-[10px] font-mono text-soc-muted">
                    <span>User: {a.user_id}</span>
                    <span className="font-semibold text-blue-400 uppercase">{a.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
