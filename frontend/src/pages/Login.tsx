import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { RoleType } from '../types';

export const Login: React.FC = () => {
  const { login, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (role: RoleType) => {
    const roleCredentials: Record<RoleType, { email: string; pass: string }> = {
      admin: { email: 'admin@fraudshield.io', pass: 'Admin@123456' },
      analyst: { email: 'analyst@fraudshield.io', pass: 'Analyst@123456' },
      viewer: { email: 'viewer@fraudshield.io', pass: 'Viewer@123456' },
    };
    const cred = roleCredentials[role];
    if (cred) {
      setEmail(cred.email);
      setPassword(cred.pass);
    }
    setIsLoading(true);
    setError(null);
    try {
      await switchDemoRole(role);
      navigate('/');
    } catch (err: any) {
      const serverDetail = err.response?.data?.detail;
      const networkError = !err.response ? 'Cannot connect to backend server (http://localhost:8000). Please start the backend service.' : 'Demo login failed: ' + (serverDetail || 'Invalid credentials');
      setError(networkError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-soc-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-soc-card border border-soc-border rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mb-3 shadow-lg shadow-blue-500/10">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FraudShield SOC</h1>
          <p className="text-xs text-slate-400 mt-1">Real-Time Financial Anomaly Operations Platform</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@fraudshield.io"
                className="w-full bg-soc-bg border border-soc-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-soc-bg border border-soc-border rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In to Operations Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Access Presets */}
        <div className="mt-8 pt-6 border-t border-soc-border">
          <div className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Quick 1-Click Role Presets
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickDemo('admin')}
              className="px-3 py-2 rounded-lg bg-soc-bg border border-soc-border hover:border-blue-500/50 text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-blue-400">Admin</div>
              <div className="text-[9px] text-slate-400">Full Access</div>
            </button>
            <button
              onClick={() => handleQuickDemo('analyst')}
              className="px-3 py-2 rounded-lg bg-soc-bg border border-soc-border hover:border-purple-500/50 text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-purple-400">Analyst</div>
              <div className="text-[9px] text-slate-400">Triage & Cases</div>
            </button>
            <button
              onClick={() => handleQuickDemo('viewer')}
              className="px-3 py-2 rounded-lg bg-soc-bg border border-soc-border hover:border-emerald-500/50 text-left transition-colors"
            >
              <div className="text-[11px] font-bold text-emerald-400">Viewer</div>
              <div className="text-[9px] text-slate-400">Read Only</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
