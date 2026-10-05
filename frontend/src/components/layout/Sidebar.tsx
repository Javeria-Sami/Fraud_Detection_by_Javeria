import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  AlertTriangle,
  FolderLock,
  UserCheck,
  BarChart3,
  Cpu,
  Sliders,
  Users,
  Settings,
  History,
  Palette,
  ShieldCheck,
  Bell,
  Activity
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const isAnalystOrAdmin = hasRole(['admin', 'analyst']);

  const navItems = [
    { label: 'SOC Dashboard', path: '/', icon: LayoutDashboard, access: 'all' },
    { label: 'Live Transactions', path: '/transactions', icon: ArrowLeftRight, access: 'all' },
    { label: 'Alerts Triage', path: '/alerts', icon: AlertTriangle, access: 'all' },
    { label: 'Case Management', path: '/cases', icon: FolderLock, access: 'analyst' },
    { label: '360° Risk Profiles', path: '/risk-profiles', icon: UserCheck, access: 'all' },
    { label: 'Notification Center', path: '/notifications', icon: Bell, access: 'all' },
    { label: 'Historical Search', path: '/search', icon: History, access: 'all' },
    { label: 'Analytics & Insights', path: '/analytics', icon: BarChart3, access: 'all' },
    { label: 'ML Models & Drift', path: '/models', icon: Cpu, access: 'all' },
    { label: 'UI Component Showcase', path: '/ui-components', icon: Palette, access: 'all' },
  ];

  const adminItems = [
    { label: 'Admin Overview', path: '/admin', icon: ShieldCheck, access: 'admin' },
    { label: 'Observability & Health', path: '/admin/observability', icon: Activity, access: 'admin' },
    { label: 'Fraud Rules Engine', path: '/admin/rules', icon: Sliders, access: 'admin' },
    { label: 'User & Role Access', path: '/admin/users', icon: Users, access: 'admin' },
    { label: 'Risk Thresholds', path: '/admin/settings', icon: Settings, access: 'admin' },
    { label: 'Audit Logs Trail', path: '/admin/audit-logs', icon: History, access: 'analyst' },
  ];

  return (
    <aside className="w-64 bg-soc-card border-r border-soc-border flex flex-col justify-between py-5 shrink-0 select-none hidden md:flex transition-colors">
      <div className="space-y-6 px-3">
        {/* Operations Section */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-soc-muted px-3 mb-2 font-mono">
            Operations & Triage
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              if (item.access === 'analyst' && !isAnalystOrAdmin) return null;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-soc-lightGreen dark:bg-emerald-950/40 text-soc-deepGreen dark:text-emerald-300 border border-emerald-600/30 font-semibold shadow-sm'
                        : 'text-soc-muted hover:text-soc-foreground hover:bg-soc-surface'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Administration Section */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-soc-muted px-3 mb-2 font-mono">
            Administration & Governance
          </div>
          <nav className="space-y-1">
            {adminItems.map((item) => {
              if (item.access === 'admin' && !isAdmin) return null;
              if (item.access === 'analyst' && !isAnalystOrAdmin) return null;
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-soc-lightGreen dark:bg-emerald-950/40 text-soc-deepGreen dark:text-emerald-300 border border-emerald-600/30 font-semibold shadow-sm'
                        : 'text-soc-muted hover:text-soc-foreground hover:bg-soc-surface'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer System Telemetry Status */}
      <div className="px-5 border-t border-soc-border pt-4">
        <div className="text-[11px] text-soc-muted font-mono flex items-center justify-between">
          <span>Defense System</span>
          <span className="text-emerald-500 font-bold">● ACTIVE</span>
        </div>
        <div className="text-[10px] text-soc-muted mt-1 font-mono">
          Engine Latency: <span className="text-soc-foreground font-semibold">0.8ms avg</span>
        </div>
      </div>
    </aside>
  );
};
