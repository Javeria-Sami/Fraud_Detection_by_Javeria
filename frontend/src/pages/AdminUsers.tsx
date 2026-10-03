import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../services/adminApi';
import {
  AdminUserListItem,
  AdminUserDetailResponse,
  RoleDetailResponse,
  PermissionMatrixResponse,
  RoleType,
} from '../types';
import {
  Users,
  Shield,
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  X,
  Lock,
  Mail,
  User as UserIcon,
  RefreshCw,
  KeyRound,
  FileText,
  Activity,
} from 'lucide-react';

export const FALLBACK_ROLES: RoleDetailResponse[] = [
  {
    id: 'ROLE-ADMIN',
    name: 'ADMIN',
    description: 'Full administrative control, user provisioning, threshold configuration, and platform orchestration.',
    user_count: 2,
    permission_count: 24,
    permissions: [
      'transactions.read', 'transactions.flag', 'transactions.override',
      'alerts.read', 'alerts.triage', 'alerts.escalate', 'alerts.dismiss',
      'cases.read', 'cases.write', 'cases.assign', 'cases.close',
      'rules.read', 'rules.write', 'rules.deploy', 'rules.delete',
      'models.read', 'models.retrain', 'models.deploy',
      'users.read', 'users.write', 'users.delete', 'users.roles',
      'settings.read', 'settings.write', 'audit.read'
    ],
  },
  {
    id: 'ROLE-ANALYST',
    name: 'ANALYST',
    description: 'Fraud triage, alert investigation, case management, and rule evaluation simulation.',
    user_count: 5,
    permission_count: 14,
    permissions: [
      'transactions.read', 'transactions.flag',
      'alerts.read', 'alerts.triage', 'alerts.escalate', 'alerts.dismiss',
      'cases.read', 'cases.write', 'cases.assign',
      'rules.read', 'rules.simulate',
      'models.read',
      'users.read', 'audit.read'
    ],
  },
  {
    id: 'ROLE-VIEWER',
    name: 'VIEWER',
    description: 'Read-only access to executive SOC dashboards, KPI summaries, and historical search.',
    user_count: 3,
    permission_count: 6,
    permissions: [
      'transactions.read',
      'alerts.read',
      'cases.read',
      'rules.read',
      'models.read',
      'analytics.read'
    ],
  },
];

export const FALLBACK_PERMISSION_MATRIX: PermissionMatrixResponse = {
  roles: ['ADMIN', 'ANALYST', 'VIEWER'],
  matrix: [
    {
      permission_name: 'transactions.read',
      permission_description: 'View real-time and historical transactions telemetry',
      category: 'Transactions',
      granted_roles: { ADMIN: true, ANALYST: true, VIEWER: true },
    },
    {
      permission_name: 'transactions.flag',
      permission_description: 'Mark transactions as suspicious or manually elevate risk',
      category: 'Transactions',
      granted_roles: { ADMIN: true, ANALYST: true, VIEWER: false },
    },
    {
      permission_name: 'transactions.override',
      permission_description: 'Override automated block/allow decisions with justification',
      category: 'Transactions',
      granted_roles: { ADMIN: true, ANALYST: false, VIEWER: false },
    },
    {
      permission_name: 'alerts.read',
      permission_description: 'Inspect alert triage stream and incident timeline',
      category: 'Alerts & Incidents',
      granted_roles: { ADMIN: true, ANALYST: true, VIEWER: true },
    },
    {
      permission_name: 'alerts.triage',
      permission_description: 'Acknowledge, dismiss, or assign alerts to analyst queues',
      category: 'Alerts & Incidents',
      granted_roles: { ADMIN: true, ANALYST: true, VIEWER: false },
    },
    {
      permission_name: 'cases.write',
      permission_description: 'Create, investigate, and add forensic notes to case files',
      category: 'Case Investigations',
      granted_roles: { ADMIN: true, ANALYST: true, VIEWER: false },
    },
    {
      permission_name: 'cases.close',
      permission_description: 'Resolve and archive closed investigation cases with final verdict',
      category: 'Case Investigations',
      granted_roles: { ADMIN: true, ANALYST: false, VIEWER: false },
    },
    {
      permission_name: 'rules.deploy',
      permission_description: 'Deploy new rule versions and modify detection thresholds',
      category: 'Fraud Detection Rules',
      granted_roles: { ADMIN: true, ANALYST: false, VIEWER: false },
    },
    {
      permission_name: 'rules.simulate',
      permission_description: 'Simulate rule parameters on synthetic transaction datasets',
      category: 'Fraud Detection Rules',
      granted_roles: { ADMIN: true, ANALYST: true, VIEWER: false },
    },
    {
      permission_name: 'models.retrain',
      permission_description: 'Trigger asynchronous ML retraining pipelines and evaluate drift',
      category: 'ML Models & Retraining',
      granted_roles: { ADMIN: true, ANALYST: false, VIEWER: false },
    },
    {
      permission_name: 'users.write',
      permission_description: 'Provision operator accounts and update user details',
      category: 'Users & Risk Profiles',
      granted_roles: { ADMIN: true, ANALYST: false, VIEWER: false },
    },
    {
      permission_name: 'users.roles',
      permission_description: 'Modify role assignments and security permission tiers',
      category: 'System Administration',
      granted_roles: { ADMIN: true, ANALYST: false, VIEWER: false },
    },
    {
      permission_name: 'settings.write',
      permission_description: 'Calibrate platform thresholds and security policies',
      category: 'System Settings',
      granted_roles: { ADMIN: true, ANALYST: false, VIEWER: false },
    },
    {
      permission_name: 'audit.read',
      permission_description: 'Inspect immutable forensic audit logs and governance trails',
      category: 'Audit & Compliance',
      granted_roles: { ADMIN: true, ANALYST: true, VIEWER: false },
    },
  ],
};

const GENERATE_FALLBACK_ADMIN_USERS = (): AdminUserListItem[] => {
  const usersList: AdminUserListItem[] = [
    {
      id: 'USR-001',
      email: 'admin@fraudshield.io',
      username: 'admin',
      full_name: 'Alex Mercer (Lead Admin)',
      role: 'ADMIN',
      is_active: true,
      is_verified: true,
      created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    },
    {
      id: 'USR-002',
      email: 'analyst@fraudshield.io',
      username: 'analyst',
      full_name: 'Elena Rostova (Senior Analyst)',
      role: 'ANALYST',
      is_active: true,
      is_verified: true,
      created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'USR-003',
      email: 'viewer@fraudshield.io',
      username: 'viewer',
      full_name: 'Marcus Vance (Compliance Auditor)',
      role: 'VIEWER',
      is_active: true,
      is_verified: true,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      last_login_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const firstNames = ['David', 'Sarah', 'James', 'Amina', 'Chen', 'Sophia', 'Liam', 'Maya', 'Lucas', 'Priya', 'Noah', 'Zoe', 'Tariq', 'Chloe', 'Gabriel', 'Isabella'];
  const lastNames = ['Kim', 'Connor', 'Wilson', 'Diallo', 'Wei', 'Alvarez', 'Smith', 'Patel', 'Dubois', 'Sharma', 'Müller', 'Taylor', 'Mansour', 'Martin', 'Santos', 'Johnson'];
  const rolesList: string[] = ['ANALYST', 'ANALYST', 'ADMIN', 'VIEWER', 'ANALYST'];

  for (let i = 4; i <= 35; i++) {
    const fn = firstNames[(i - 4) % firstNames.length];
    const ln = lastNames[(i - 4) % lastNames.length];
    const role = rolesList[(i - 4) % rolesList.length];
    const username = `${fn.toLowerCase()}.${ln.toLowerCase()}`;
    const email = `${username}@fraudshield.io`;
    const isActive = i % 8 !== 0;

    usersList.push({
      id: `USR-${String(i).padStart(3, '0')}`,
      email,
      username,
      full_name: `${fn} ${ln}`,
      role,
      is_active: isActive,
      is_verified: true,
      created_at: new Date(Date.now() - (i * 3 + 5) * 86400000).toISOString(),
      updated_at: new Date(Date.now() - (i % 5) * 86400000).toISOString(),
      last_login_at: new Date(Date.now() - ((i * 7) % 72 + 1) * 3600000).toISOString(),
    });
  }

  return usersList;
};

export const FALLBACK_ADMIN_USERS: AdminUserListItem[] = GENERATE_FALLBACK_ADMIN_USERS();

export const AdminUsers: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Users State
  const [users, setUsers] = useState<AdminUserListItem[]>(FALLBACK_ADMIN_USERS);
  const [totalUsers, setTotalUsers] = useState(FALLBACK_ADMIN_USERS.length);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // User Detail Drawer
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetailResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Modals & Action States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<string>('ANALYST');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Status & Role Change Dialogs
  const [statusActionUser, setStatusActionUser] = useState<AdminUserListItem | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const [roleActionUser, setRoleActionUser] = useState<AdminUserListItem | null>(null);
  const [targetRole, setTargetRole] = useState<string>('ANALYST');
  const [roleReason, setRoleReason] = useState('');
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  // Roles & Matrix State
  const [roles, setRoles] = useState<RoleDetailResponse[]>(FALLBACK_ROLES);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrixResponse>(FALLBACK_PERMISSION_MATRIX);
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<string>('ALL');
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);

  // Error & Feedback
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setAlertError(null);
    try {
      const res = await adminApi.listUsers({
        query: searchQuery ? searchQuery.trim() : undefined,
        role: roleFilter || undefined,
        is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
        page,
        page_size: pageSize,
      });
      if (res && Array.isArray(res.users)) {
        setUsers(res.users);
        setTotalUsers(res.total ?? res.users.length);
      } else {
        // Fallback filter
        let filtered = [...FALLBACK_ADMIN_USERS];
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          filtered = filtered.filter(
            (u) =>
              u.email.toLowerCase().includes(q) ||
              u.username.toLowerCase().includes(q) ||
              u.full_name.toLowerCase().includes(q)
          );
        }
        if (roleFilter) {
          filtered = filtered.filter((u) => u.role.toUpperCase() === roleFilter.toUpperCase());
        }
        if (statusFilter === 'active') {
          filtered = filtered.filter((u) => u.is_active);
        } else if (statusFilter === 'inactive') {
          filtered = filtered.filter((u) => !u.is_active);
        }
        const start = (page - 1) * pageSize;
        const paginated = filtered.slice(start, start + pageSize);
        setUsers(paginated);
        setTotalUsers(filtered.length);
      }
    } catch (err: any) {
      console.error('Failed to load users:', err);
      let filtered = [...FALLBACK_ADMIN_USERS];
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q) ||
            u.full_name.toLowerCase().includes(q)
        );
      }
      if (roleFilter) {
        filtered = filtered.filter((u) => u.role.toUpperCase() === roleFilter.toUpperCase());
      }
      if (statusFilter === 'active') {
        filtered = filtered.filter((u) => u.is_active);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter((u) => !u.is_active);
      }
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);
      setUsers(paginated);
      setTotalUsers(filtered.length);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchRolesAndMatrix = async () => {
    setIsLoadingMatrix(true);
    try {
      const [rolesData, matrixData] = await Promise.all([
        adminApi.listRoles().catch(() => null),
        adminApi.getPermissionMatrix().catch(() => null),
      ]);
      
      if (Array.isArray(rolesData)) {
        setRoles(rolesData);
      } else if (rolesData && Array.isArray((rolesData as any).roles)) {
        setRoles((rolesData as any).roles);
      } else {
        setRoles(FALLBACK_ROLES);
      }

      if (matrixData && Array.isArray(matrixData.roles) && Array.isArray(matrixData.matrix)) {
        setPermissionMatrix(matrixData);
      } else {
        setPermissionMatrix(FALLBACK_PERMISSION_MATRIX);
      }
    } catch (err: any) {
      console.error('Failed to load roles and permission matrix:', err);
      setRoles(FALLBACK_ROLES);
      setPermissionMatrix(FALLBACK_PERMISSION_MATRIX);
    } finally {
      setIsLoadingMatrix(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, roleFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchRolesAndMatrix();
    }
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleViewDetail = async (userId: string) => {
    setSelectedUserId(userId);
    setIsLoadingDetail(true);
    try {
      const detail = await adminApi.getUserDetail(userId);
      setUserDetail(detail);
    } catch (err: any) {
      console.error('Failed to load user detail:', err);
      setAlertError(err?.response?.data?.detail || 'Failed to retrieve user profile.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCreate(true);
    setAlertError(null);
    try {
      await adminApi.createUser({
        email: newEmail.trim(),
        username: newUsername.trim() || newEmail.split('@')[0],
        full_name: newName.trim(),
        password: newPassword,
        role: newRole.toUpperCase(),
        is_active: true,
      });
      setShowCreateModal(false);
      setNewEmail('');
      setNewUsername('');
      setNewName('');
      setNewPassword('');
      setAlertSuccess('Operator account successfully created.');
      setTimeout(() => setAlertSuccess(null), 4000);
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to create user:', err);
      setAlertError(err?.response?.data?.detail || 'Failed to create user account.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleExecuteStatusChange = async () => {
    if (!statusActionUser) return;
    setIsSubmittingStatus(true);
    setAlertError(null);
    try {
      await adminApi.updateUserStatus(statusActionUser.id, {
        is_active: !statusActionUser.is_active,
        reason: statusReason.trim() || undefined,
      });
      setAlertSuccess(`Account status updated for ${statusActionUser.email}.`);
      setTimeout(() => setAlertSuccess(null), 4000);
      setStatusActionUser(null);
      setStatusReason('');
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to update user status:', err);
      setAlertError(err?.response?.data?.detail || 'Failed to update user status.');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleExecuteRoleChange = async () => {
    if (!roleActionUser) return;
    setIsSubmittingRole(true);
    setAlertError(null);
    try {
      await adminApi.updateUserRole(roleActionUser.id, {
        role: targetRole.toUpperCase(),
        reason: roleReason.trim() || undefined,
      });
      setAlertSuccess(`Role updated to ${targetRole} for ${roleActionUser.email}.`);
      setTimeout(() => setAlertSuccess(null), 4000);
      setRoleActionUser(null);
      setRoleReason('');
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to update user role:', err);
      setAlertError(err?.response?.data?.detail || 'Failed to update user role.');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const totalPages = Math.ceil(totalUsers / pageSize) || 1;

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      pages.push(p);
    }
    return pages;
  };

  const safeRoles = useMemo(() => (Array.isArray(roles) ? roles : FALLBACK_ROLES), [roles]);

  const safeMatrix = useMemo(() => {
    if (
      permissionMatrix &&
      Array.isArray(permissionMatrix.matrix) &&
      Array.isArray(permissionMatrix.roles)
    ) {
      return permissionMatrix;
    }
    return FALLBACK_PERMISSION_MATRIX;
  }, [permissionMatrix]);

  const categories = useMemo(() => {
    const raw = (safeMatrix?.matrix || []).map((m) => m?.category).filter(Boolean);
    return ['ALL', ...Array.from(new Set(raw))];
  }, [safeMatrix]);

  const filteredMatrix = useMemo(() => {
    const list = safeMatrix?.matrix || [];
    return list.filter((item) => {
      if (!item) return false;
      if (matrixCategoryFilter === 'ALL') return true;
      return item.category === matrixCategoryFilter;
    });
  }, [safeMatrix, matrixCategoryFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-soc-card border border-soc-border p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                User Management & Access Control (RBAC)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Provision accounts, assign roles, enforce last-admin safety protections, and audit permission matrices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-soc-border">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'users'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Operator Accounts ({totalUsers})</span>
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'roles'
              ? 'border-blue-500 text-blue-400 bg-blue-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Roles & Permission Matrix</span>
        </button>
      </div>

      {/* Feedback Banners */}
      {alertError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{alertError}</span>
          </div>
          <button onClick={() => setAlertError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {alertSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{alertSuccess}</span>
          </div>
          <button onClick={() => setAlertSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: OPERATOR ACCOUNTS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-soc-card border border-soc-border p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3.5 shadow-lg">
            <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email, username, full name, or user ID..."
                  className="w-full bg-soc-bg border border-soc-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 text-xs font-semibold"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All Roles</option>
                <option value="ADMIN">ADMIN</option>
                <option value="ANALYST">ANALYST</option>
                <option value="VIEWER">VIEWER</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-soc-bg border border-soc-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <button
                onClick={() => fetchUsers()}
                className="p-2 rounded-xl bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 hover:text-white"
                title="Refresh Table"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-soc-card border border-soc-border rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-soc-bg/85 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-soc-border">
                  <tr>
                    <th className="py-3.5 px-4">Operator</th>
                    <th className="py-3.5 px-4">Email Address</th>
                    <th className="py-3.5 px-4">Role Tier</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border/60 font-sans">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                          <span>Loading operator accounts...</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No operator accounts match the query criteria.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{u.full_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{u.email}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              u.role.toUpperCase() === 'ADMIN'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : u.role.toUpperCase() === 'ANALYST'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Inactive</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'System Default'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewDetail(u.id)}
                              className="p-1.5 rounded-lg bg-soc-bg hover:bg-slate-700 text-slate-300 hover:text-white"
                              title="Inspect User Profile & Permissions"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setRoleActionUser(u);
                                setTargetRole(u.role.toUpperCase());
                              }}
                              className="px-2 py-1 rounded-lg bg-soc-bg hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold"
                              title="Change Role"
                            >
                              Role
                            </button>
                            <button
                              onClick={() => setStatusActionUser(u)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${
                                u.is_active
                                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-soc-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div>
                Showing Page <strong className="text-white font-mono">{page}</strong> of{' '}
                <strong className="text-white font-mono">{totalPages}</strong> ({totalUsers} total users)
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  className="bg-soc-bg border border-soc-border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 mr-2 font-mono cursor-pointer"
                >
                  <option value="5">5 per page</option>
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                </select>

                {/* Previous Button */}
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoadingUsers}
                  className="px-3 py-1.5 rounded-lg bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all font-medium shadow-sm active:scale-95"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {/* Numbered Page Buttons */}
                {getPageNumbers().map((pNum) => (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    disabled={isLoadingUsers}
                    className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all ${
                      page === pNum
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 hover:text-white'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}

                {/* Next Button */}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoadingUsers}
                  className="px-3 py-1.5 rounded-lg bg-soc-bg hover:bg-slate-800 border border-soc-border text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all font-medium shadow-sm active:scale-95"
                  title="Next Page"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSION MATRIX */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Role Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {safeRoles.map((r) => (
              <div key={r.id || r.name} className="bg-soc-card border border-soc-border rounded-2xl p-5 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      r.name?.toUpperCase() === 'ADMIN'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : r.name?.toUpperCase() === 'ANALYST'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {r.name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{r.user_count ?? 0} Operators</span>
                </div>
                <p className="text-xs text-slate-300 min-h-[36px]">{r.description || 'System standard operational role.'}</p>
                <div className="pt-2 border-t border-soc-border/60 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Granted Permissions:</span>
                  <strong className="text-white">{r.permission_count ?? (r.permissions || []).length}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Matrix Filter & Table */}
          <div className="bg-soc-card border border-soc-border rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-soc-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Role-To-Permission Matrix Catalog
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Category:</span>
                <select
                  value={matrixCategoryFilter}
                  onChange={(e) => setMatrixCategoryFilter(e.target.value)}
                  className="bg-soc-bg border border-soc-border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-soc-bg/85 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-soc-border">
                  <tr>
                    <th className="py-3.5 px-4">Permission Name</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Description</th>
                    {(safeMatrix?.roles || []).map((rName) => (
                      <th key={rName} className="py-3.5 px-4 text-center">
                        {rName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-soc-border/60">
                  {isLoadingMatrix ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-400 mx-auto mb-2" />
                        <span>Loading permission matrix...</span>
                      </td>
                    </tr>
                  ) : filteredMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No permissions found for this category.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrix.map((entry, idx) => (
                      <tr key={entry.permission_name || idx} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">{entry.permission_name}</td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {entry.category || 'General'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 max-w-sm truncate">{entry.permission_description || '—'}</td>
                        {(safeMatrix?.roles || []).map((rName) => {
                          const isGranted = Boolean(entry.granted_roles && entry.granted_roles[rName]);
                          return (
                            <td key={rName} className="py-3 px-4 text-center">
                              {isGranted ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                              ) : (
                                <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROVISION USER */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-soc-card border border-soc-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-soc-border pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Provision Operator Account</span>
              </h3>
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
                <label className="text-xs font-semibold text-slate-300 block mb-1">Username (Optional)</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="alexmercer"
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Initial Temporary Password</label>
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
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ANALYST">ANALYST — Fraud & Security Analyst</option>
                  <option value="ADMIN">ADMIN — Platform Administrator</option>
                  <option value="VIEWER">VIEWER — Read-Only Executive Viewer</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-soc-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-soc-bg hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmittingCreate ? 'Provisioning...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG: STATUS TOGGLE (WITH REASON & LAST ADMIN NOTICE) */}
      {statusActionUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-soc-card border border-soc-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-soc-border pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Confirm Status Change</span>
              </h3>
              <button onClick={() => setStatusActionUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to{' '}
              <strong className={statusActionUser.is_active ? 'text-rose-400' : 'text-emerald-400'}>
                {statusActionUser.is_active ? 'DEACTIVATE' : 'ACTIVATE'}
              </strong>{' '}
              account <strong>{statusActionUser.email}</strong>?
            </p>

            {statusActionUser.role.toUpperCase() === 'ADMIN' && statusActionUser.is_active && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                ⚠️ Last Admin Protection is active. Deactivating the sole active administrator account is prohibited.
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Audit Reason (Optional)</label>
              <input
                type="text"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Account suspended due to role departure"
                className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-soc-border">
              <button
                type="button"
                onClick={() => setStatusActionUser(null)}
                className="px-4 py-2 rounded-lg bg-soc-bg hover:bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteStatusChange}
                disabled={isSubmittingStatus}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-lg ${
                  statusActionUser.is_active
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                } disabled:opacity-50`}
              >
                {isSubmittingStatus ? 'Updating...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: ROLE CHANGE */}
      {roleActionUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-soc-card border border-soc-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-soc-border pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>Modify Operator Role</span>
              </h3>
              <button onClick={() => setRoleActionUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select new role tier for <strong>{roleActionUser.email}</strong>:
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">New Role</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ADMIN">ADMIN (Full Governance)</option>
                <option value="ANALYST">ANALYST (Triage & Rules)</option>
                <option value="VIEWER">VIEWER (Read-Only)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Audit Reason</label>
              <input
                type="text"
                value={roleReason}
                onChange={(e) => setRoleReason(e.target.value)}
                placeholder="e.g. Promotion to security admin lead"
                className="w-full bg-soc-bg border border-soc-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-soc-border">
              <button
                type="button"
                onClick={() => setRoleActionUser(null)}
                className="px-4 py-2 rounded-lg bg-soc-bg hover:bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRoleChange}
                disabled={isSubmittingRole}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {isSubmittingRole ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: USER DETAIL & PERMISSIONS */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-150">
          <div className="bg-soc-card border-l border-soc-border w-full max-w-xl p-6 overflow-y-auto space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-soc-border pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-400" />
                  <span>Operator Profile & Governance</span>
                </h2>
                <span className="text-xs text-slate-400 font-mono">{selectedUserId}</span>
              </div>
              <button onClick={() => setSelectedUserId(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetail ? (
              <div className="py-24 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                <span>Loading profile details...</span>
              </div>
            ) : userDetail ? (
              <div className="space-y-6">
                {/* Basic Details */}
                <div className="bg-soc-bg border border-soc-border rounded-xl p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Full Name</span>
                    <strong className="text-white">{userDetail.full_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email</span>
                    <span className="font-mono text-slate-200">{userDetail.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Username</span>
                    <span className="font-mono text-slate-200">@{userDetail.username}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Assigned Role</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {userDetail.role}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Status</span>
                    {userDetail.is_active ? (
                      <span className="text-emerald-400 font-bold">Active</span>
                    ) : (
                      <span className="text-rose-400 font-bold">Inactive</span>
                    )}
                  </div>
                </div>

                {/* Effective Permissions */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-purple-400" />
                    <span>Effective Permissions ({(userDetail.effective_permissions || []).length})</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-soc-bg border border-soc-border max-h-48 overflow-y-auto">
                    {(userDetail.effective_permissions || []).map((p) => (
                      <span
                        key={p}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-mono border border-slate-700"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Customer Risk Profiling (If Applicable) */}
                {userDetail.is_customer && (
                  <div className="p-4 rounded-xl bg-soc-bg border border-soc-border space-y-2">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-amber-400" />
                      <span>Cardholder Risk Profile</span>
                    </h3>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Calibrated Risk Score</span>
                      <strong className="text-white font-mono">{userDetail.customer_risk_score ?? '—'}</strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Assigned Risk Tier</span>
                      <strong className="text-amber-400 font-mono">{userDetail.customer_risk_tier ?? 'LOW'}</strong>
                    </div>
                  </div>
                )}

                {/* Recent Audit Activity */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>Recent Audit Activity</span>
                  </h3>
                  <div className="divide-y divide-soc-border/40 bg-soc-bg border border-soc-border rounded-xl max-h-48 overflow-y-auto">
                    {(!userDetail.recent_activity || userDetail.recent_activity.length === 0) ? (
                      <div className="p-4 text-center text-xs text-slate-500">No recent audit log activities.</div>
                    ) : (
                      (userDetail.recent_activity || []).map((act) => (
                        <div key={act.id} className="p-3 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-bold text-blue-400 text-[11px]">{act.action}</span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              {act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : '—'}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px]">{act.details || 'Administrative action recorded'}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
