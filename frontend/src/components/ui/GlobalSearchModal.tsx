import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, LayoutDashboard, ArrowLeftRight, AlertTriangle, FolderLock, UserCheck, Sliders, Users, Settings, History } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isAnalystOrAdmin = user?.role === 'admin' || user?.role === 'analyst';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNavLinks = [
    { label: 'SOC Dashboard', path: '/', category: 'Operations', icon: LayoutDashboard, access: true },
    { label: 'Live Transactions Stream', path: '/transactions', category: 'Operations', icon: ArrowLeftRight, access: true },
    { label: 'Security Alerts Triage', path: '/alerts', category: 'Operations', icon: AlertTriangle, access: true },
    { label: 'Case Management Dossiers', path: '/cases', category: 'Investigation', icon: FolderLock, access: isAnalystOrAdmin },
    { label: '360° Entity Risk Profiles', path: '/risk-profiles', category: 'Investigation', icon: UserCheck, access: true },
    { label: 'Historical & Investigation Search', path: '/search', category: 'Investigation', icon: History, access: true },
    { label: 'Fraud Rule Engine & Weights', path: '/admin/rules', category: 'Administration', icon: Sliders, access: isAdmin },
    { label: 'User Provisioning & Roles', path: '/admin/users', category: 'Administration', icon: Users, access: isAdmin },
    { label: 'Risk Threshold Policies', path: '/admin/settings', category: 'Administration', icon: Settings, access: isAdmin },
    { label: 'Tamper-Evident Audit Logs', path: '/admin/audit-logs', category: 'Compliance', icon: History, access: isAnalystOrAdmin },
  ].filter(item => item.access);

  const filteredLinks = quickNavLinks.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
      setQuery('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl rounded-2xl border border-soc-border bg-soc-card text-soc-foreground shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center px-4 py-3.5 border-b border-soc-border">
          <Search className="w-5 h-5 text-soc-muted mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search operations, pages, rules, or type transaction/case ID..."
            className="w-full bg-transparent text-sm text-soc-foreground placeholder:text-soc-muted focus:outline-none"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} className="p-1 rounded hover:bg-soc-cardHover text-soc-muted">
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-soc-surface border border-soc-border rounded text-soc-muted">
              ESC
            </kbd>
          )}
        </form>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={() => handleSelect(`/search?q=${encodeURIComponent(query.trim())}`)}
              className="w-full mb-2 flex items-center justify-between p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 transition-colors text-left text-xs group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100 group-hover:text-cyan-300">
                    Search all historical records for &quot;{query.trim()}&quot;
                  </div>
                  <div className="text-[11px] text-cyan-400 font-mono">Query across Transactions, Alerts, Cases, and Profiles</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
          )}

          {filteredLinks.length === 0 && !query.trim() ? (
            <div className="p-8 text-center text-xs text-soc-muted">
              No matching pages or tools found.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-soc-muted px-3 py-1.5">
                Quick Navigation & Workspaces
              </div>
              {filteredLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleSelect(item.path)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-soc-cardHover transition-colors text-left text-xs group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-soc-surface border border-soc-border text-soc-muted group-hover:text-blue-400 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-soc-foreground group-hover:text-blue-400 transition-colors">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-soc-muted font-mono">{item.category}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-soc-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2.5 bg-soc-surface/50 border-t border-soc-border flex items-center justify-between text-[11px] font-mono text-soc-muted">
          <span>Global Search UI Foundation</span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1 py-0.5 bg-soc-card border border-soc-border rounded text-[10px]">Ctrl+K</kbd> to open anytime
          </span>
        </div>
      </div>
    </div>
  );
};
