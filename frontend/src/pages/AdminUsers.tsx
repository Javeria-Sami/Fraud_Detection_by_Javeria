import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { User, RoleType } from '../types';
import { Users, Plus, ShieldCheck, Mail, Lock, UserPlus, X } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<RoleType>('analyst');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<User[]>('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post<User>('/admin/users', {
        email: newEmail,
        full_name: newName,
        password: newPassword,
        role: newRole,
      });
      setUsers((prev) => [res.data, ...prev]);
      setShowCreateModal(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
    } catch (err) {
      console.error('Failed to create user:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>User & Access Control (RBAC)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage system operators, analysts, viewers, and role-based operational permissions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-soc-card border border-soc-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-soc-bg/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-soc-border">
              <tr>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soc-border/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{u.full_name}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold uppercase ${
                      u.role === 'admin' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      u.role === 'analyst' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-emerald-400 text-xs font-semibold">Active</span>
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'System Default'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-soc-card border border-soc-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-soc-border pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Provision Operator Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="alex.mercer@fraudshield.io"
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Role & Permissions Tier</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as RoleType)}
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="analyst">Fraud / Security Analyst</option>
                  <option value="admin">Platform Administrator</option>
                  <option value="viewer">Executive Viewer (Read Only)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-soc-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-soc-bg hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
                >
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
