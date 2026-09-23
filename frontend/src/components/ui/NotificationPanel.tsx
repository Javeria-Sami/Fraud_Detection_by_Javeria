import React, { useRef, useEffect } from 'react';
import { Bell, ShieldAlert, Check, AlertTriangle, ExternalLink } from 'lucide-react';
import { useWebSocket } from '../../context/WebSocketContext';
import { Link } from 'react-router-dom';

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const { liveAlerts, clearAlerts } = useWebSocket();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Security Notifications Panel"
      className="absolute right-0 top-12 mt-2 w-80 sm:w-96 rounded-2xl border border-soc-border bg-soc-card shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-soc-border mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <Bell className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-soc-foreground tracking-tight">
            Security Notifications
          </span>
          {liveAlerts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold">
              {liveAlerts.length}
            </span>
          )}
        </div>
        {liveAlerts.length > 0 && (
          <button
            onClick={clearAlerts}
            className="text-[11px] font-medium text-soc-muted hover:text-soc-foreground transition-colors flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Alert Feed */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {liveAlerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-soc-muted space-y-1">
            <p className="font-semibold text-soc-foreground">No active live alerts</p>
            <p className="text-[11px]">System operating within normal risk parameters.</p>
          </div>
        ) : (
          liveAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-3 rounded-xl border text-xs transition-all ${
                alt.severity === 'CRITICAL'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  {alt.severity === 'CRITICAL' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  {alt.severity} ALERT
                </span>
                <span className="font-mono text-[11px] font-bold">
                  Score: {alt.risk_score.toFixed(0)}/100
                </span>
              </div>
              <p className="text-[11px] text-soc-foreground/90 line-clamp-2 leading-relaxed">
                {alt.alert_reason}
              </p>
              <div className="mt-2 pt-2 border-t border-current/10 flex items-center justify-between text-[10px] font-mono text-soc-muted">
                <span>TXN: {alt.transaction_id.slice(0, 16)}...</span>
                <Link
                  to="/alerts"
                  onClick={onClose}
                  className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Triage <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-soc-border flex items-center justify-between text-[11px]">
        <span className="text-soc-muted font-mono">Stream: Active</span>
        <Link
          to="/alerts"
          onClick={onClose}
          className="text-blue-400 hover:text-blue-300 font-semibold"
        >
          View All Alerts Queue →
        </Link>
      </div>
    </div>
  );
};
