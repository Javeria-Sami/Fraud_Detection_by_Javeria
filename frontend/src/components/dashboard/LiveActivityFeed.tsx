import React from 'react';
import { Radio, ShieldAlert, Cpu, Activity, Clock, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { LiveActivityItem } from '../../types';
import { SeverityBadge } from '../shared/SeverityBadge';
import { RiskScoreBadge } from '../shared/RiskScoreBadge';

export interface LiveActivityFeedProps {
  events: LiveActivityItem[];
  onClear?: () => void;
  maxEvents?: number;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  events = [],
  onClear,
  maxEvents = 50,
}) => {
  const getEventIcon = (type: string, severity?: string) => {
    if (type.startsWith('alert')) {
      return <ShieldAlert className={`w-4 h-4 ${severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`} />;
    }
    if (type.startsWith('risk')) {
      return <Cpu className="w-4 h-4 text-purple-400" />;
    }
    return <Activity className="w-4 h-4 text-blue-400" />;
  };

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <CardTitle>Live Security Activity Stream</CardTitle>
              <CardDescription>Real-time threat & event bus dispatch (bounded {maxEvents})</CardDescription>
            </div>
          </div>
          {events.length > 0 && onClear && (
            <button
              onClick={onClear}
              className="p-1 text-soc-muted hover:text-slate-200 transition-colors"
              title="Clear event stream buffer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {events.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6">
            <Radio className="w-8 h-8 text-slate-600 animate-pulse mb-2" />
            <span className="text-xs font-semibold text-slate-400">Listening for live streaming events...</span>
            <p className="text-[11px] text-soc-muted mt-1 max-w-xs">
              Incoming transactions, risk calculations, and alert triggers will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-3 bg-soc-bg border border-soc-border/70 hover:border-slate-700 rounded-lg transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="mt-0.5 p-1 rounded bg-slate-800 shrink-0">
                      {getEventIcon(evt.type, evt.severity)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-soc-foreground truncate">
                        {evt.title}
                      </div>
                      {evt.details && (
                        <div className="text-[11px] text-soc-muted line-clamp-1 mt-0.5">
                          {evt.details}
                        </div>
                      )}
                      {evt.entityId && (
                        <div className="text-[10px] font-mono text-blue-400 mt-1">
                          ID: {evt.entityId}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-soc-muted">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {evt.severity && (
                      <SeverityBadge severity={evt.severity as any} size="sm" />
                    )}
                    {evt.riskScore !== undefined && !evt.severity && (
                      <RiskScoreBadge score={evt.riskScore} size="sm" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
