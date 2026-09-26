import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  Info,
  Check,
  CheckCheck,
  ExternalLink,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { notificationApi } from '../../services/notificationApi';
import { NotificationItem } from '../../types';
import { useWebSocket } from '../../context/WebSocketContext';

export interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const { status, liveAlerts } = useWebSocket();
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationApi.fetchNotifications({ page_size: 10 });
      setNotifications(data.items);
      setUnreadCount(data.unread_count);
      if (onUnreadCountChange) {
        onUnreadCountChange(data.unread_count);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, loadNotifications]);

  // Re-fetch on incoming live alerts from WebSocket
  useEffect(() => {
    if (isOpen && liveAlerts.length > 0) {
      loadNotifications();
    }
  }, [liveAlerts, isOpen, loadNotifications]);

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

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (onUnreadCountChange) onUnreadCountChange(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.read_at) {
      try {
        await notificationApi.markAsRead(n.id);
      } catch (err) {
        // ignore
      }
    }
    onClose();

    // Deep link navigation
    if (n.source_type === 'ALERT' && n.source_id) {
      navigate('/alerts');
    } else if (n.source_type === 'CASE' && n.source_id) {
      navigate(`/cases/${n.source_id}`);
    } else if (n.source_type === 'MODEL') {
      navigate('/admin/models');
    } else {
      navigate('/notifications');
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return `${Math.floor(diffSecs / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'HIGH':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
  };

  const getSeverityBg = (severity: string, isRead: boolean) => {
    if (isRead) return 'bg-soc-surface hover:bg-soc-cardHover border-soc-border opacity-75';
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50';
      case 'HIGH':
        return 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50';
      case 'WARNING':
        return 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50';
      default:
        return 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Centralized Security Notifications Panel"
      className="absolute right-0 top-12 mt-2 w-84 sm:w-96 rounded-2xl border border-soc-border bg-soc-card shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-soc-border mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 dark:text-blue-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-soc-foreground tracking-tight block">
              Notifications
            </span>
            <span className="text-[10px] text-soc-muted font-mono">
              {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              title="Mark all as read"
              className="text-[11px] font-medium text-soc-muted hover:text-soc-foreground transition-colors flex items-center gap-1 px-2 py-1 rounded-md bg-soc-surface border border-soc-border"
            >
              <CheckCheck className="w-3 h-3" />
              <span>Read All</span>
            </button>
          )}
          <Link
            to="/notifications"
            onClick={onClose}
            title="Notification Settings & Hub"
            className="p-1 rounded-md text-soc-muted hover:text-soc-foreground hover:bg-soc-surface transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {loading && notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-soc-muted">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-soc-muted space-y-1">
            <Sparkles className="w-6 h-6 text-soc-muted mx-auto mb-1 opacity-50" />
            <p className="font-semibold text-soc-foreground">No recent notifications</p>
            <p className="text-[11px]">You're all caught up with security and system events.</p>
          </div>
        ) : (
          notifications.map((n) => {
            const isRead = !!n.read_at;
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${getSeverityBg(
                  n.severity,
                  isRead
                )}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getSeverityIcon(n.severity)}
                    <span className="font-semibold text-soc-foreground truncate text-[11px]">
                      {n.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-soc-muted font-mono flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimeAgo(n.created_at)}
                    </span>
                    {!isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        title="Mark as read"
                        className="p-0.5 rounded hover:bg-white/10 text-soc-muted hover:text-soc-foreground"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-soc-muted line-clamp-2 leading-relaxed mb-2">
                  {n.message}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-soc-muted pt-1.5 border-t border-current/10">
                  <span className="truncate">
                    {n.source_type && `${n.source_type}: `}
                    {n.source_id || n.category}
                  </span>
                  <span className="text-blue-500 dark:text-blue-400 font-semibold inline-flex items-center gap-0.5 hover:underline">
                    View <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-soc-border flex items-center justify-between text-[11px]">
        <span className="text-soc-muted font-mono text-[10px] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Real-time Sync
        </span>
        <Link
          to="/notifications"
          onClick={onClose}
          className="text-blue-500 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
        >
          <span>View Notification Center</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
