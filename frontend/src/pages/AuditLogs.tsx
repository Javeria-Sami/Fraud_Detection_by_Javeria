import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { AuditLog } from '../types';
import { History, Search, RefreshCw, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let url = `/audit-logs?limit=100`;
      const res = await apiClient.get<AuditLog[]>(url);
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.actor_email.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.target_entity.toLowerCase().includes(search.toLowerCase()) ||
      l.target_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            <span>Immutable Security Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident logs of administrative actions, rule modifications, model deployments, case resolutions, and logins.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 rounded-lg bg-soc-bg border border-soc-border hover:bg-slate-800 text-slate-300 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter audit entries by Actor, Action Type (RULE_UPDATE, CASE_RESOLVE), Target..."
          className="w-full bg-soc-card border border-soc-border rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Audit Log Table */}
      <div className="bg-soc-card border border-soc-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-soc-bg/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-soc-border">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Target ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Diff / Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/60 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-sans">
                    {isLoading ? 'Fetching audit trail...' : 'No audit records match query.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                      </td>
                      <td className="py-3 px-4 text-slate-200">
                        <div>{log.actor_email}</div>
                        <div className="text-[10px] text-blue-400 uppercase">{log.actor_role}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        <span className="bg-slate-800 px-2 py-0.5 rounded">{log.action}</span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">{log.target_entity}</td>
                      <td className="py-3 px-4 text-blue-400 text-[11px]">{log.target_id}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-slate-400 hover:text-white">
                          {expandedLogId === log.id ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Diff inspection row */}
                    {expandedLogId === log.id && (
                      <tr className="bg-soc-bg/95">
                        <td colSpan={7} className="p-4 border-b border-soc-border space-y-2 font-mono text-[11px]">
                          {log.details && (
                            <div className="text-slate-300 font-sans text-xs mb-2">
                              <span className="font-semibold text-white">Summary:</span> {log.details}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-black/50 border border-soc-border rounded-lg">
                              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Previous State (Old Diff)</div>
                              <pre className="text-rose-400 overflow-x-auto">{JSON.stringify(log.diff_old || {}, null, 2)}</pre>
                            </div>
                            <div className="p-3 bg-black/50 border border-soc-border rounded-lg">
                              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">New State (Applied Diff)</div>
                              <pre className="text-emerald-400 overflow-x-auto">{JSON.stringify(log.diff_new || {}, null, 2)}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
