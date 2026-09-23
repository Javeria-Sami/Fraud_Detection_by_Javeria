import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { SubsystemStatus } from '../../types';

export interface SystemStatusPanelProps {
  systems?: SubsystemStatus[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({
  systems = [],
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'DEGRADED':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'ERROR':
        return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'UNKNOWN':
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'DEGRADED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'ERROR':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'UNKNOWN':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-rose-500/30 p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-rose-400">Failed to load system health</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Retry
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <div>
              <CardTitle>Platform Subsystem Health & Pipeline Integrity</CardTitle>
              <CardDescription>Live operational diagnostics for detection microservices and database engines</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {systems.map((sys, idx) => (
            <div
              key={idx}
              className="p-3 bg-soc-bg border border-soc-border/80 rounded-lg flex flex-col justify-between space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold text-soc-foreground truncate">
                  {sys.name}
                </span>
                {getStatusIcon(sys.status)}
              </div>

              <div className="text-[11px] text-soc-muted line-clamp-2">
                {sys.message}
              </div>

              <div className="pt-1 border-t border-soc-border/40 flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border ${getStatusBadge(
                    sys.status
                  )}`}
                >
                  ● {sys.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
