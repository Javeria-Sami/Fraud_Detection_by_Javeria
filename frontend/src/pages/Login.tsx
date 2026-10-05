import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ShieldAlert, ArrowRight, UserCheck, Users, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { RoleType } from '../types';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: RoleType;
  title: string;
  description: string;
  avatarColor: string;
}

const DEMO_USERS: DemoUser[] = [
  {
    id: 'admin-01',
    name: 'Alex Mercer',
    email: 'admin@fraudshield.io',
    password: 'Admin@123456',
    role: 'admin',
    title: 'Security Operations Officer',
    description: 'Full administrative access, rules governance, system configuration, and audit trails',
    avatarColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  {
    id: 'analyst-01',
    name: 'Elena Rostova',
    email: 'analyst@fraudshield.io',
    password: 'Analyst@123456',
    role: 'analyst',
    title: 'Lead Fraud Investigator',
    description: 'Alert triage, investigation cases, entity risk profiles, and transaction simulation',
    avatarColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
  {
    id: 'viewer-01',
    name: 'David Vance',
    email: 'viewer@fraudshield.io',
    password: 'Viewer@123456',
    role: 'viewer',
    title: 'Compliance & Audit Inspector',
    description: 'Read-only visibility for security telemetry, reporting, and model monitoring',
    avatarColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'cust-01',
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'User@123456',
    role: 'viewer',
    title: 'Retail Banking Customer',
    description: 'Standard retail customer account with routine card transactions and device fingerprints',
    avatarColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  },
  {
    id: 'cust-02',
    name: 'Sarah Connor',
    email: 'sarah.connor@example.com',
    password: 'User@123456',
    role: 'viewer',
    title: 'High-Velocity Trading Customer',
    description: 'Frequent high-velocity transactions across international geo-locations',
    avatarColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
  },
  {
    id: 'cust-03',
    name: 'Alice Smith',
    email: 'alice.smith@example.com',
    password: 'User@123456',
    role: 'viewer',
    title: 'Corporate Treasury Customer',
    description: 'Large wire transfers, enterprise merchant volume, and strict anomaly thresholds',
    avatarColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  },
  {
    id: 'cust-04',
    name: 'Tariq Al-Mansoor',
    email: 'tariq.m@example.com',
    password: 'User@123456',
    role: 'viewer',
    title: 'Cross-Border Merchant Partner',
    description: 'Multi-currency settlement account and device fleet profiling',
    avatarColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
  },
  {
    id: 'cust-05',
    name: 'Marcus Vance',
    email: 'marcus.v@example.com',
    password: 'User@123456',
    role: 'viewer',
    title: 'Private Wealth Client',
    description: 'High net-worth account with elevated velocity and investment transfers',
    avatarColor: 'bg-teal-500/20 text-teal-400 border-teal-500/30'
  },
  {
    id: 'cust-06',
    name: 'Aiko Tanaka',
    email: 'aiko.t@example.com',
    password: 'User@123456',
    role: 'viewer',
    title: 'APAC Regional Merchant',
    description: 'Tokyo e-commerce checkout integration with multi-device sessions',
    avatarColor: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  },
  {
    id: 'cust-07',
    name: 'David Becker',
    email: 'david.b@example.com',
    password: 'User@123456',
    role: 'viewer',
    title: 'Fintech API Consumer',
    description: 'Automated micro-transaction endpoint client account',
    avatarColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30'
  },
  {
    id: 'cust-08',
    name: 'Chloe Dubois',
    email: 'chloe.d@example.com',
    password: 'User@123456',
    role: 'viewer',
    title: 'EU Mobile Banking User',
    description: 'SEPA instant transfer active consumer profile',
    avatarColor: 'bg-violet-500/20 text-violet-400 border-violet-500/30'
  },
  {
    id: 'cust-09',
    name: "Liam O'Connor",
    email: 'liam.o@example.com',
    password: 'User@123456',
    role: 'viewer',
    title: 'Point-of-Sale Merchant',
    description: 'Physical terminal merchant account with fraud velocity rules',
    avatarColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  }
];

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@fraudshield.io');
  const [password, setPassword] = useState('Admin@123456');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DemoUser>(DEMO_USERS[0]);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [autofillSuccessMsg, setAutofillSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      const serverDetail = err.response?.data?.detail;
      setError(serverDetail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectUser = (user: DemoUser, autoSignIn: boolean = false) => {
    setSelectedUser(user);
    setEmail(user.email);
    setPassword(user.password);
    setError(null);

    setAutofillSuccessMsg(`Autofilled credentials for ${user.name} (${user.role.toUpperCase()})`);
    setTimeout(() => setAutofillSuccessMsg(null), 3000);

    if (autoSignIn) {
      setIsLoading(true);
      login(user.email, user.password)
        .then(() => navigate('/'))
        .catch((err: any) => {
          const serverDetail = err.response?.data?.detail;
          setError(serverDetail || 'Login failed. Please verify the backend is running.');
        })
        .finally(() => setIsLoading(false));
    }
  };

  return (
    <div className="min-h-screen bg-soc-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-soc-card border border-soc-border rounded-2xl shadow-xl p-6 sm:p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 mb-3 shadow-sm">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-soc-foreground tracking-tight">FraudShield SOC</h1>
          <p className="text-xs text-soc-muted mt-1">Financial Cyber Defense & Real-Time Anomaly Platform</p>
        </div>

        {/* Autofill Notification Banner */}
        {autofillSuccessMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{autofillSuccessMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-soc-foreground block mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-soc-muted absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fraudshield.io"
                className="w-full bg-white dark:bg-slate-900 border border-soc-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-soc-foreground block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-soc-muted absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white dark:bg-slate-900 border border-soc-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-soc-foreground placeholder:text-soc-muted focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-[#1B5E20] hover:bg-[#144718] text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/15 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In to Operations Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Role Presets */}
        <div className="mt-6 pt-5 border-t border-soc-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-soc-muted">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Quick 1-Click Role Presets</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAllUsers(!showAllUsers)}
              className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 font-medium flex items-center gap-1 transition-colors"
            >
              <span>{showAllUsers ? 'Hide All Users' : 'Autofill All Users'}</span>
              {showAllUsers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectUser(DEMO_USERS[0], true)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedUser.id === 'admin-01'
                  ? 'bg-emerald-500/15 border-emerald-600 text-emerald-900 dark:text-emerald-300 shadow-sm'
                  : 'bg-soc-surface border-soc-border hover:border-emerald-500/40 text-soc-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">Admin</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              </div>
              <div className="text-[9px] text-soc-muted leading-tight font-medium">Alex Mercer</div>
              <div className="text-[8px] text-soc-muted font-mono mt-0.5 truncate">admin@...</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectUser(DEMO_USERS[1], true)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedUser.id === 'analyst-01'
                  ? 'bg-amber-500/15 border-amber-600 text-amber-900 dark:text-amber-300 shadow-sm'
                  : 'bg-soc-surface border-soc-border hover:border-amber-500/40 text-soc-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400">Analyst</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
              </div>
              <div className="text-[9px] text-soc-muted leading-tight font-medium">Elena Rostova</div>
              <div className="text-[8px] text-soc-muted font-mono mt-0.5 truncate">analyst@...</div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectUser(DEMO_USERS[2], true)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedUser.id === 'viewer-01'
                  ? 'bg-emerald-500/15 border-emerald-600 text-emerald-900 dark:text-emerald-300 shadow-sm'
                  : 'bg-soc-surface border-soc-border hover:border-emerald-500/40 text-soc-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">Viewer</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              </div>
              <div className="text-[9px] text-soc-muted leading-tight font-medium">David Vance</div>
              <div className="text-[8px] text-soc-muted font-mono mt-0.5 truncate">viewer@...</div>
            </button>
          </div>
        </div>

        {/* Extended All Users Autofill Drawer */}
        {showAllUsers && (
          <div className="mt-4 pt-4 border-t border-soc-border space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-soc-muted flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-soc-muted" />
                Select any user to autofill or instant-login:
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {DEMO_USERS.map((u) => (
                <div
                  key={u.id}
                  className={`p-2.5 rounded-lg border text-left flex items-center justify-between gap-3 transition-all ${
                    selectedUser.id === u.id
                      ? 'bg-emerald-500/10 border-emerald-500/60 shadow-sm'
                      : 'bg-soc-surface border-soc-border hover:border-emerald-500/40'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-soc-foreground truncate">{u.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${u.avatarColor}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-soc-muted font-mono truncate">{u.email}</div>
                    <div className="text-[9px] text-soc-muted truncate">{u.title}</div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectUser(u, false)}
                      className="px-2 py-1 rounded bg-soc-card hover:bg-soc-surface text-soc-foreground border border-soc-border text-[10px] font-medium transition-colors"
                      title="Fill email and password into form"
                    >
                      Autofill
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectUser(u, true)}
                      className="px-2.5 py-1 rounded bg-[#1B5E20] hover:bg-[#144718] text-white text-[10px] font-bold flex items-center gap-1 transition-colors shadow-sm"
                      title="Sign in immediately"
                    >
                      <span>Login</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
