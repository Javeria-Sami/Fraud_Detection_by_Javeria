import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Drawer } from '../ui/Drawer';
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
  Shield,
  Palette
} from 'lucide-react';

export interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isAnalystOrAdmin = user?.role === 'admin' || user?.role === 'analyst';

  const navItems = [
    { label: 'SOC Dashboard', path: '/', icon: LayoutDashboard, access: 'all' },
    { label: 'Live Transactions', path: '/transactions', icon: ArrowLeftRight, access: 'all' },
    { label: 'Alerts Triage', path: '/alerts', icon: AlertTriangle, access: 'all' },
    { label: 'Case Management', path: '/cases', icon: FolderLock, access: 'analyst' },
    { label: '360° Risk Profiles', path: '/risk-profiles', icon: UserCheck, access: 'all' },
    { label: 'Analytics & Insights', path: '/analytics', icon: BarChart3, access: 'all' },
    { label: 'ML Models & Drift', path: '/models', icon: Cpu, access: 'all' },
    { label: 'UI Component Library', path: '/ui-components', icon: Palette, access: 'all' },
  ];

  const adminItems = [
    { label: 'Fraud Rules Engine', path: '/admin/rules', icon: Sliders, access: 'admin' },
    { label: 'User & Role Access', path: '/admin/users', icon: Users, access: 'admin' },
    { label: 'Risk Thresholds', path: '/admin/settings', icon: Settings, access: 'admin' },
    { label: 'Audit Logs Trail', path: '/admin/audit-logs', icon: History, access: 'analyst' },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="left"
      size="sm"
      title="Navigation Menu"
      description="Financial Security Operations"
    >
      <div className="space-y-6">
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
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                        : 'text-soc-muted hover:text-soc-foreground hover:bg-soc-cardHover'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
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
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                        : 'text-soc-muted hover:text-soc-foreground hover:bg-soc-cardHover'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </Drawer>
  );
};
