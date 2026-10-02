import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, RoleType } from '../types';
import { apiClient } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  switchDemoRole: (role: RoleType) => Promise<void>;
  hasRole: (roles: RoleType | RoleType[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fraudshield_token'));
  const [refreshToken, setRefreshToken] = useState<string | null>(localStorage.getItem('fraudshield_refresh_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    const storedToken = localStorage.getItem('fraudshield_token');
    const storedUser = localStorage.getItem('fraudshield_user');
    
    if (storedToken) {
      if (storedToken.startsWith('demo_token_') && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          setIsLoading(false);
          return;
        } catch {}
      }

      try {
        const res = await apiClient.get<User>('/auth/me');
        setUser(res.data);
        setToken(storedToken);
        localStorage.setItem('fraudshield_user', JSON.stringify(res.data));
      } catch (error) {
        // If we have stored user, keep demo session intact
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
            setIsLoading(false);
            return;
          } catch {}
        }

        // Try refresh token if available
        const storedRefresh = localStorage.getItem('fraudshield_refresh_token');
        if (storedRefresh) {
          try {
            const refreshRes = await apiClient.post<{ access_token: string }>('/auth/refresh', {
              refresh_token: storedRefresh
            });
            const newAccess = refreshRes.data.access_token;
            localStorage.setItem('fraudshield_token', newAccess);
            setToken(newAccess);
            const userRes = await apiClient.get<User>('/auth/me');
            setUser(userRes.data);
            setIsLoading(false);
            return;
          } catch (e) {
            // refresh failed
          }
        }
        localStorage.removeItem('fraudshield_token');
        localStorage.removeItem('fraudshield_refresh_token');
        localStorage.removeItem('fraudshield_user');
        setUser(null);
        setToken(null);
        setRefreshToken(null);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { access_token, refresh_token, user_id, role, permissions, full_name } = res.data;
      localStorage.setItem('fraudshield_token', access_token);
      if (refresh_token) {
        localStorage.setItem('fraudshield_refresh_token', refresh_token);
        setRefreshToken(refresh_token);
      }
      setToken(access_token);
      const userObj: User = {
        id: user_id,
        email,
        full_name,
        role: role.toLowerCase() as RoleType,
        permissions: permissions || [],
        is_active: true,
      };
      localStorage.setItem('fraudshield_user', JSON.stringify(userObj));
      setUser(userObj);
    } catch (err: any) {
      // Offline / Serverless / Demo fallback
      const emailLower = email.trim().toLowerCase();
      const demoAccounts: Record<string, { role: RoleType; name: string; permissions: string[] }> = {
        'admin@fraudshield.io': { role: 'admin', name: 'Alex Mercer', permissions: ['*'] },
        'analyst@fraudshield.io': {
          role: 'analyst',
          name: 'Elena Rostova',
          permissions: [
            'transaction.read', 'transaction.create', 'transaction.update',
            'alert.read', 'alert.update', 'alert.assign',
            'case.read', 'case.create', 'case.update',
            'user.read', 'rule.read', 'model.read', 'analytics.read'
          ]
        },
        'viewer@fraudshield.io': {
          role: 'viewer',
          name: 'David Vance',
          permissions: ['transaction.read', 'alert.read', 'case.read', 'user.read', 'rule.read', 'model.read', 'analytics.read']
        },
        'john.doe@example.com': { role: 'viewer', name: 'John Doe', permissions: ['transaction.read', 'alert.read'] },
        'sarah.connor@example.com': { role: 'viewer', name: 'Sarah Connor', permissions: ['transaction.read', 'alert.read'] },
        'alice.smith@example.com': { role: 'viewer', name: 'Alice Smith', permissions: ['transaction.read', 'alert.read'] },
        'tariq.m@example.com': { role: 'viewer', name: 'Tariq Al-Mansoor', permissions: ['transaction.read', 'alert.read'] },
        'marcus.v@example.com': { role: 'viewer', name: 'Marcus Vance', permissions: ['transaction.read', 'alert.read'] },
        'aiko.t@example.com': { role: 'viewer', name: 'Aiko Tanaka', permissions: ['transaction.read', 'alert.read'] },
        'david.b@example.com': { role: 'viewer', name: 'David Becker', permissions: ['transaction.read', 'alert.read'] },
        'chloe.d@example.com': { role: 'viewer', name: 'Chloe Dubois', permissions: ['transaction.read', 'alert.read'] },
        'liam.o@example.com': { role: 'viewer', name: "Liam O'Connor", permissions: ['transaction.read', 'alert.read'] },
      };

      if (demoAccounts[emailLower]) {
        const demoUser = demoAccounts[emailLower];
        const mockToken = `demo_token_${demoUser.role}_${Date.now()}`;
        const userObj: User = {
          id: `demo-${demoUser.role}-01`,
          email: emailLower,
          full_name: demoUser.name,
          role: demoUser.role,
          permissions: demoUser.permissions,
          is_active: true,
        };
        localStorage.setItem('fraudshield_token', mockToken);
        localStorage.setItem('fraudshield_user', JSON.stringify(userObj));
        setToken(mockToken);
        setUser(userObj);
        return;
      }
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (token && !token.startsWith('demo_token_')) {
        await apiClient.post('/auth/logout');
      }
    } catch (e) {
      // ignore network errors on logout
    } finally {
      localStorage.removeItem('fraudshield_token');
      localStorage.removeItem('fraudshield_refresh_token');
      localStorage.removeItem('fraudshield_user');
      setToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    const storedRefresh = localStorage.getItem('fraudshield_refresh_token') || refreshToken;
    if (!storedRefresh) return null;
    try {
      const res = await apiClient.post<{ access_token: string }>('/auth/refresh', {
        refresh_token: storedRefresh
      });
      const newAccess = res.data.access_token;
      localStorage.setItem('fraudshield_token', newAccess);
      setToken(newAccess);
      return newAccess;
    } catch {
      await logout();
      return null;
    }
  };

  const hasRole = (roles: RoleType | RoleType[]): boolean => {
    if (!user) return false;
    const userRole = user.role.toLowerCase() as RoleType;
    if (Array.isArray(roles)) {
      return roles.map(r => r.toLowerCase()).includes(userRole);
    }
    return userRole === roles.toLowerCase();
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role.toLowerCase() === 'admin') return true;
    const userPerms = user.permissions || [];
    return userPerms.includes('*') || userPerms.includes(permission);
  };

  const switchDemoRole = async (role: RoleType) => {
    const credentials: Record<RoleType, { email: string; pass: string }> = {
      admin: { email: 'admin@fraudshield.io', pass: 'Admin@123456' },
      analyst: { email: 'analyst@fraudshield.io', pass: 'Analyst@123456' },
      viewer: { email: 'viewer@fraudshield.io', pass: 'Viewer@123456' },
    };
    const cred = credentials[role];
    if (cred) {
      await login(cred.email, cred.pass);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshAccessToken,
        switchDemoRole,
        hasRole,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
