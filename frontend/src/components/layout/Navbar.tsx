import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Shield,
  Radio,
  Bell,
  Play,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Check,
  Search,
  Sun,
  Moon,
  Menu,
  Lock,
  Layers
} from 'lucide-react';
import { RoleType } from '../../types';
import { NotificationPanel } from '../ui/NotificationPanel';
import { GlobalSearchModal } from '../ui/GlobalSearchModal';

interface NavbarProps {
  onToggleSimulator: () => void;
  isSimulatorOpen: boolean;
  onToggleMobileNav?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSimulator,
  isSimulatorOpen,
  onToggleMobileNav,
}) => {
  const { user, logout, switchDemoRole } = useAuth();
  const { status, liveAlerts } = useWebSocket();
  const { theme, toggleTheme } = useTheme();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const roles: { role: RoleType; label: string; desc: string }[] = [
    { role: 'admin', label: 'Administrator', desc: 'Full System & Rule Control' },
    { role: 'analyst', label: 'Security Analyst', desc: 'Case & Alert Triage' },
    { role: 'viewer', label: 'Executive Viewer', desc: 'Read-only Oversight' },
  ];

  return (
    <>
      <header className="h-16 bg-soc-card border-b border-soc-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md transition-colors">
        {/* Left Section: Mobile Menu + Brand + Connection */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Mobile Menu Hamburger */}
          {onToggleMobileNav && (
            <button
              type="button"
              onClick={onToggleMobileNav}
              aria-label="Open mobile navigation"
              className="p-2 rounded-lg bg-soc-surface border border-soc-border text-soc-muted hover:text-soc-foreground md:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Platform Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-500 dark:text-blue-400 shadow-sm shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-soc-foreground tracking-tight">
                  FraudShield
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-500 dark:text-blue-400 font-mono font-bold hidden sm:inline-block">
                  SOC v1.0
                </span>
              </div>
              <p className="text-[11px] text-soc-muted hidden md:block">Financial Cyber Defense & Anomaly Platform</p>
            </div>
          </div>

          {/* WebSocket Status Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-soc-surface border border-soc-border text-xs font-mono">
            {status === 'CONNECTED' ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-live" />
                <span className="text-emerald-500 font-semibold tracking-wide text-[11px]">LIVE STREAM</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-amber-500 font-semibold tracking-wide text-[11px]">RECONNECTING</span>
              </>
            )}
          </div>
        </div>

        {/* Right Section: Global Search + Simulator + Notifications + Theme + User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search Button */}
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            aria-label="Open global search"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-soc-surface border border-soc-border hover:border-slate-600 text-soc-muted hover:text-soc-foreground text-xs transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-soc-muted" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.2 bg-soc-card border border-soc-border rounded text-[10px] font-mono">
              Ctrl+K
            </kbd>
          </button>

          {/* Simulator Toggle Button */}
          <button
            onClick={onToggleSimulator}
            aria-label="Toggle Transaction Simulator"
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isSimulatorOpen
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-soc-surface hover:bg-soc-cardHover text-soc-foreground border-soc-border'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>Simulator</span>
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(prev => !prev)}
              aria-label="Security Notifications"
              className="p-2 rounded-lg bg-soc-surface border border-soc-border hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground relative transition-colors"
            >
              <Bell className="w-4 h-4" />
              {liveAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {liveAlerts.length}
                </span>
              )}
            </button>
            <NotificationPanel
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>

          {/* Theme Toggle (Dark / Light) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 rounded-lg bg-soc-surface border border-soc-border hover:bg-soc-cardHover text-soc-muted hover:text-soc-foreground transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600" />
            )}
          </button>

          {/* User Menu & Role Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              aria-haspopup="true"
              aria-expanded={showRoleDropdown}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-soc-surface border border-soc-border hover:bg-soc-cardHover text-xs transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-500 dark:text-blue-400 font-bold flex items-center justify-center text-xs uppercase">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-semibold text-soc-foreground leading-none text-xs">
                  {user?.full_name || user?.email || 'User'}
                </div>
                <div className="text-[10px] text-soc-muted font-mono uppercase mt-0.5">
                  {user?.role || 'Guest'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-soc-muted" />
            </button>

            {/* Dropdown Menu */}
            {showRoleDropdown && (
              <div
                className="absolute right-0 mt-2 w-64 bg-soc-card border border-soc-border rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                role="menu"
              >
                {/* Active User Identity */}
                <div className="px-2 py-2 border-b border-soc-border mb-2">
                  <div className="font-semibold text-xs text-soc-foreground">
                    {user?.full_name || 'Authenticated User'}
                  </div>
                  <div className="text-[11px] text-soc-muted truncate font-mono">
                    {user?.email}
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-[10px] font-mono font-bold text-blue-500 dark:text-blue-400 uppercase">
                    <Lock className="w-3 h-3" />
                    Role: {user?.role || 'viewer'}
                  </div>
                </div>

                {/* Switch Demo Roles Section */}
                <div className="text-[10px] font-bold uppercase tracking-wider text-soc-muted px-2 mb-1.5 font-mono">
                  Quick Role Switcher
                </div>
                <div className="space-y-1">
                  {roles.map((r) => {
                    const isCurrent = user?.role?.toLowerCase() === r.role.toLowerCase();
                    return (
                      <button
                        key={r.role}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          switchDemoRole(r.role);
                          setShowRoleDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors ${
                          isCurrent
                            ? 'bg-blue-600/15 text-blue-500 dark:text-blue-400 font-semibold'
                            : 'text-soc-muted hover:text-soc-foreground hover:bg-soc-cardHover'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold">{r.label}</div>
                          <div className="text-[10px] text-soc-muted">{r.desc}</div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Logout Button */}
                <div className="border-t border-soc-border mt-2 pt-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      logout();
                      setShowRoleDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </>
  );
};
