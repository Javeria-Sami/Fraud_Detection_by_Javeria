import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  Info,
  Check,
  CheckCheck,
  Search,
  Filter,
  Sliders,
  ExternalLink,
  Trash2,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  Lock,
  Mail,
  Smartphone,
  Globe,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { notificationApi } from '../services/notificationApi';
import {
  NotificationItem,
  NotificationPreferenceItem,
  NotificationSeverityType,
  NotificationCategoryType
} from '../types';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'security' | 'cases' | 'ml' | 'preferences'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [highCount, setHighCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // Selected Notification Detail Modal
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);

  // Preferences State
  const [preferences, setPreferences] = useState<NotificationPreferenceItem[]>([]);
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);
  const [prefsSuccessMsg, setPrefsSuccessMsg] = useState<string>('');

  // Load KPI metrics
  const loadMetrics = useCallback(async () => {
    try {
      const counts = await notificationApi.fetchUnreadCount();
      if (counts) {
        setUnreadCount(counts.unread_count || 0);
        setCriticalCount(counts.critical_count || 0);
        setHighCount(counts.high_count || 0);
      }
    } catch (err) {
      console.error('Failed to load notification metrics:', err);
    }
  }, []);

  // Load Notifications
  const loadNotifications = useCallback(async () => {
    if (activeTab === 'preferences') return;

    try {
      setLoading(true);
      setError(null);
      let cat: string | undefined = undefined;
      let unreadOnly = false;

      if (activeTab === 'unread') {
        unreadOnly = true;
      } else if (activeTab === 'security') {
        cat = 'SECURITY_ALERTS';
      } else if (activeTab === 'cases') {
        cat = 'CASE_UPDATES';
      } else if (activeTab === 'ml') {
        cat = 'MODEL_MONITORING';
      }

      const res = await notificationApi.fetchNotifications({
        unread_only: unreadOnly || undefined,
        category: cat,
        severity: severityFilter || undefined,
        priority: priorityFilter || undefined,
        search: searchQuery || undefined,
        page,
        page_size: pageSize
      });

      setNotifications(res?.items || []);
      setTotal(res?.total || 0);
      setUnreadCount(res?.unread_count || 0);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err?.response?.data?.detail || 'Failed to load notifications from server.');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, severityFilter, priorityFilter, searchQuery, page, pageSize]);

  // Load Preferences
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notificationApi.fetchPreferences();
      setPreferences(res?.preferences || []);
    } catch (err: any) {
      console.error('Failed to load notification preferences:', err);
      setError(err?.response?.data?.detail || 'Failed to load notification preferences.');
      setPreferences([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (activeTab === 'preferences') {
      loadPreferences();
    } else {
      loadNotifications();
    }
  }, [activeTab, loadNotifications, loadPreferences]);

  // Action Handlers
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      if (selectedNotification && selectedNotification.id === id) {
        setSelectedNotification(prev => prev ? { ...prev, read_at: new Date().toISOString() } : null);
      }
      loadMetrics();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      await notificationApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
      loadMetrics();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDismiss = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.dismissNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      if (selectedNotification && selectedNotification.id === id) {
        setSelectedNotification(null);
      }
      loadMetrics();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const handlePreferenceToggle = (category: string, channel: string) => {
    setPreferences(prev =>
      prev.map(p => {
        if (p.category === category && p.channel === channel) {
          if (p.is_mandatory) return p; // Cannot toggle mandatory
          return { ...p, enabled: !p.enabled };
        }
        return p;
      })
    );
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      const payload = preferences.map(p => ({
        category: p.category,
        channel: p.channel,
        enabled: p.enabled
      }));
      const res = await notificationApi.updatePreferences(payload);
      setPreferences(res.preferences);
      setPrefsSuccessMsg('Notification preferences saved successfully.');
      setTimeout(() => setPrefsSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 font-mono text-[10px] font-bold inline-flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 font-mono text-[10px] font-bold inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> HIGH
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-mono text-[10px] font-bold inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> WARNING
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-500 dark:text-blue-400 font-mono text-[10px] font-bold inline-flex items-center gap-1">
            <Info className="w-3 h-3" /> INFO
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'SECURITY_ALERTS':
        return 'Security & Fraud';
      case 'CASE_UPDATES':
        return 'Case Updates';
      case 'MODEL_MONITORING':
        return 'ML & MLOps';
      case 'ADMIN_SYSTEM':
        return 'Admin & System';
      default:
        return cat;
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-soc-foreground tracking-tight">
                Notification Center
              </h1>
              <p className="text-xs sm:text-sm text-soc-muted">
                Centralized multi-channel alerts, case assignments, and MLOps notifications
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && activeTab !== 'preferences' && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={() => {
              if (activeTab === 'preferences') loadPreferences();
              else {
                loadNotifications();
                loadMetrics();
              }
            }}
            className="p-2 rounded-lg bg-soc-card border border-soc-border hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-soc-card border border-soc-border shadow-sm">
          <div className="flex items-center justify-between text-soc-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Unread Alerts</span>
            <Bell className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-soc-foreground font-mono">{unreadCount}</div>
          <div className="text-[11px] text-soc-muted mt-1">Requiring triage or review</div>
        </div>

        <div className="p-4 rounded-2xl bg-soc-card border border-soc-border shadow-sm">
          <div className="flex items-center justify-between text-soc-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Critical Security</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-500 font-mono">{criticalCount}</div>
          <div className="text-[11px] text-soc-muted mt-1">Immediate action required</div>
        </div>

        <div className="p-4 rounded-2xl bg-soc-card border border-soc-border shadow-sm">
          <div className="flex items-center justify-between text-soc-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">High Priority</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500 font-mono">{highCount}</div>
          <div className="text-[11px] text-soc-muted mt-1">High risk alerts & drift</div>
        </div>

        <div className="p-4 rounded-2xl bg-soc-card border border-soc-border shadow-sm">
          <div className="flex items-center justify-between text-soc-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider font-mono">Delivery Channels</span>
            <Globe className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-soc-foreground font-mono">3 Active</div>
          <div className="text-[11px] text-soc-muted mt-1 font-mono">IN_APP • EMAIL • WEBHOOK</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-soc-border flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setActiveTab('all');
              setPage(1);
            }}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => {
              setActiveTab('unread');
              setPage(1);
            }}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'unread'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-500 dark:text-rose-400 text-[10px] font-mono font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('security');
              setPage(1);
            }}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            Security & Fraud
          </button>
          <button
            onClick={() => {
              setActiveTab('cases');
              setPage(1);
            }}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'cases'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            Case Updates
          </button>
          <button
            onClick={() => {
              setActiveTab('ml');
              setPage(1);
            }}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all shrink-0 ${
              activeTab === 'ml'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            ML & System
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1 shrink-0 ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                : 'border-transparent text-soc-muted hover:text-soc-foreground'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Channel Preferences</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab !== 'preferences' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-3 rounded-xl bg-soc-card border border-soc-border flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-soc-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search notifications by title, message, or source ID..."
                className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-soc-surface border border-soc-border text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by Severity"
                className="px-2.5 py-1.5 rounded-lg bg-soc-surface border border-soc-border text-xs text-soc-foreground focus:outline-none focus:border-blue-500"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="WARNING">Warning</option>
                <option value="INFO">Info</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by Priority"
                className="px-2.5 py-1.5 rounded-lg bg-soc-surface border border-soc-border text-xs text-soc-foreground focus:outline-none focus:border-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          {/* Notifications Feed */}
          {loading ? (
            <div className="p-12 text-center text-xs text-soc-muted bg-soc-card rounded-2xl border border-soc-border">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span>Loading notification stream...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-soc-muted bg-soc-card rounded-2xl border border-soc-border space-y-2">
              <Sparkles className="w-8 h-8 text-soc-muted mx-auto opacity-50 mb-2" />
              <div className="font-semibold text-soc-foreground text-sm">No notifications found</div>
              <p className="text-soc-muted text-xs">
                {searchQuery || severityFilter || priorityFilter
                  ? 'No notifications match your active search filters.'
                  : 'All systems are operating normally with no active alerts.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => {
                const isRead = !!n.read_at;
                return (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNotification(n)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isRead
                        ? 'bg-soc-card border-soc-border hover:border-slate-600 opacity-80'
                        : n.severity === 'CRITICAL'
                        ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50'
                        : n.severity === 'HIGH'
                        ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50'
                    }`}
                  >
                    {/* Left Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getSeverityBadge(n.severity)}
                        <span className="text-[10px] px-2 py-0.5 rounded bg-soc-surface border border-soc-border text-soc-muted font-mono uppercase">
                          {getCategoryLabel(n.category)}
                        </span>
                        {!isRead && (
                          <span className="h-2 w-2 rounded-full bg-blue-500" title="Unread" />
                        )}
                        <span className="text-[11px] text-soc-muted font-mono flex items-center gap-1 ml-auto sm:ml-0">
                          <Clock className="w-3 h-3" />
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="font-semibold text-sm text-soc-foreground flex items-center gap-2">
                        <span>{n.title}</span>
                      </div>

                      <p className="text-xs text-soc-muted leading-relaxed line-clamp-2">
                        {n.message}
                      </p>

                      {n.source_id && (
                        <div className="text-[10px] font-mono text-soc-muted flex items-center gap-2 pt-1">
                          <span>Source: {n.source_type} #{n.source_id}</span>
                        </div>
                      )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-soc-border">
                      {!isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          title="Mark as Read"
                          className="px-2.5 py-1.5 rounded-lg bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-xs text-soc-foreground font-medium flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                          <span className="hidden sm:inline">Mark Read</span>
                        </button>
                      )}

                      <button
                        onClick={(e) => handleDismiss(n.id, e)}
                        title="Dismiss"
                        className="p-1.5 rounded-lg bg-soc-surface hover:bg-soc-cardHover border border-soc-border text-soc-muted hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedNotification(n)}
                        className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-500 dark:text-blue-400 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {total > pageSize && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-soc-border text-xs text-soc-muted">
              <span>
                Showing {notifications.length > 0 ? (page - 1) * pageSize + 1 : 0} -{' '}
                {Math.min(page * pageSize, total)} of {total} notifications
              </span>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="p-1.5 rounded-lg bg-soc-card border border-soc-border disabled:opacity-40 hover:bg-slate-800 text-soc-foreground transition-colors"
                  title="First Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                    Math.max(0, page - 3),
                    Math.min(totalPages, page + 2)
                  ).map((pNum) => (
                    <button
                      key={`notif-page-${pNum}`}
                      type="button"
                      onClick={() => setPage(pNum)}
                      className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg border font-mono text-xs transition-all ${
                        page === pNum
                          ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-sm shadow-blue-500/20'
                          : 'bg-soc-card border-soc-border text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="p-1.5 rounded-lg bg-soc-card border border-soc-border disabled:opacity-40 hover:bg-slate-800 text-soc-foreground transition-colors"
                  title="Last Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Channel Preferences Management View */
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-soc-card border border-soc-border shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-soc-border">
              <div>
                <h2 className="text-base font-bold text-soc-foreground">Delivery Channel Preferences</h2>
                <p className="text-xs text-soc-muted mt-0.5">
                  Configure real-time in-app badges and external email notifications for each alert category.
                </p>
              </div>
              <button
                onClick={handleSavePreferences}
                disabled={savingPrefs}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{savingPrefs ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>

            {prefsSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{prefsSuccessMsg}</span>
              </div>
            )}

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  key: 'SECURITY_ALERTS',
                  label: 'Security & Fraud Alerts',
                  desc: 'High and critical risk operational alerts, anomaly detections, and fraud rule violations.',
                  mandatoryInApp: true
                },
                {
                  key: 'CASE_UPDATES',
                  label: 'Case Management',
                  desc: 'Analyst assignments, case escalations, triage notes, and investigation resolutions.',
                  mandatoryInApp: false
                },
                {
                  key: 'MODEL_MONITORING',
                  label: 'ML & MLOps Health',
                  desc: 'Feature drift warnings, model health degradation, and automated retraining triggers.',
                  mandatoryInApp: false
                },
                {
                  key: 'ADMIN_SYSTEM',
                  label: 'Administration & System',
                  desc: 'Rule administration updates, system configuration changes, and security audit events.',
                  mandatoryInApp: false
                }
              ].map((cat) => {
                const inAppPref = (preferences || []).find(p => p.category === cat.key && p.channel === 'IN_APP');
                const emailPref = (preferences || []).find(p => p.category === cat.key && p.channel === 'EMAIL');

                return (
                  <div key={cat.key} className="p-4 rounded-xl bg-soc-surface border border-soc-border space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-soc-foreground">{cat.label}</span>
                        {cat.mandatoryInApp && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono font-bold flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> MANDATORY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-soc-muted mt-1 leading-relaxed">{cat.desc}</p>
                    </div>

                    <div className="pt-3 border-t border-soc-border/50 space-y-2.5">
                      {/* In-App Toggle */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-soc-foreground">
                          <Smartphone className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                          <span>In-App Real-time Hub</span>
                        </div>
                        {cat.mandatoryInApp ? (
                          <span className="text-[11px] text-soc-muted font-mono font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3 text-soc-muted" /> Always Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePreferenceToggle(cat.key, 'IN_APP')}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                              inAppPref?.enabled ? 'bg-blue-600' : 'bg-soc-border'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                inAppPref?.enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Email Toggle */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-soc-foreground">
                          <Mail className="w-4 h-4 text-amber-500" />
                          <span>Email Dispatch</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePreferenceToggle(cat.key, 'EMAIL')}
                          className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                            emailPref?.enabled ? 'bg-blue-600' : 'bg-soc-border'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              emailPref?.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-xl bg-soc-card border border-soc-border rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-soc-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(selectedNotification.severity)}
                  <span className="text-xs text-soc-muted font-mono">
                    Priority: {selectedNotification.priority}
                  </span>
                </div>
                <h3 className="text-base font-bold text-soc-foreground mt-1">
                  {selectedNotification.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedNotification(null)}
                className="p-1.5 rounded-lg text-soc-muted hover:text-soc-foreground hover:bg-soc-surface transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 text-xs">
              <div>
                <span className="font-semibold text-soc-muted block mb-1 uppercase tracking-wider font-mono text-[10px]">
                  Message Content
                </span>
                <p className="p-3 rounded-xl bg-soc-surface border border-soc-border text-soc-foreground leading-relaxed">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Source & Metadata */}
              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="p-3 rounded-xl bg-soc-surface border border-soc-border">
                  <span className="text-soc-muted block text-[10px]">Source Type</span>
                  <span className="font-semibold text-soc-foreground">
                    {selectedNotification.source_type || 'SYSTEM'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-soc-surface border border-soc-border">
                  <span className="text-soc-muted block text-[10px]">Source Reference ID</span>
                  <span className="font-semibold text-soc-foreground truncate block">
                    {selectedNotification.source_id || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Deliveries */}
              {selectedNotification.deliveries && selectedNotification.deliveries.length > 0 && (
                <div>
                  <span className="font-semibold text-soc-muted block mb-1.5 uppercase tracking-wider font-mono text-[10px]">
                    Delivery Channel History
                  </span>
                  <div className="space-y-1.5">
                    {selectedNotification.deliveries.map((del) => (
                      <div
                        key={del.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-soc-surface border border-soc-border text-[11px] font-mono"
                      >
                        <span className="font-semibold">{del.channel}</span>
                        <span className="text-emerald-400 font-bold">{del.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-soc-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!selectedNotification.read_at && (
                  <button
                    onClick={() => handleMarkAsRead(selectedNotification.id)}
                    className="px-3 py-1.5 rounded-lg bg-soc-surface border border-soc-border hover:bg-soc-cardHover text-xs font-semibold text-soc-foreground"
                  >
                    Mark as Read
                  </button>
                )}
                <button
                  onClick={() => handleDismiss(selectedNotification.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>

              {selectedNotification.source_type === 'ALERT' ? (
                <Link
                  to="/alerts"
                  onClick={() => setSelectedNotification(null)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  <span>Open Alert Queue</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : selectedNotification.source_type === 'CASE' ? (
                <Link
                  to={`/cases/${selectedNotification.source_id}`}
                  onClick={() => setSelectedNotification(null)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  <span>Open Case Workspace</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : selectedNotification.source_type === 'MODEL' ? (
                <Link
                  to="/models"
                  onClick={() => setSelectedNotification(null)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                >
                  <span>Inspect ML Model</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
