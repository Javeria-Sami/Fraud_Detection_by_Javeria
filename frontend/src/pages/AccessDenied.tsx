import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AccessDenied: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900/90 border border-red-500/30 rounded-xl p-8 text-center shadow-2xl backdrop-blur-md">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-slate-100 mb-2 font-mono tracking-tight">
          Access Denied
        </h1>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Your current security role{' '}
          <span className="text-red-400 font-mono font-semibold uppercase px-2 py-0.5 bg-red-950/50 rounded border border-red-900/50">
            {user?.role || 'Guest'}
          </span>{' '}
          does not possess the necessary clearance privileges to access this operational resource.
        </p>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-xs text-slate-500 font-mono mb-6 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>RBAC Policy: Insufficient Clearance</span>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Operations Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
