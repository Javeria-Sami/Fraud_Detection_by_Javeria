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
    if (storedToken) {
      try {
        const res = await apiClient.get<User>('/auth/me');
        setUser(res.data);
        setToken(storedToken);
      } catch (error) {
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
    const res = await apiClient.post('/auth/login', { email, password });
    const { access_token, refresh_token, user_id, role, permissions, full_name } = res.data;
    localStorage.setItem('fraudshield_token', access_token);
    if (refresh_token) {
      localStorage.setItem('fraudshield_refresh_token', refresh_token);
      setRefreshToken(refresh_token);
    }
    setToken(access_token);
    setUser({
      id: user_id,
      email,
      full_name,
      role: role.toLowerCase() as RoleType,
      permissions: permissions || [],
      is_active: true,
    });
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch (e) {
      // ignore network errors on logout
    } finally {
      localStorage.removeItem('fraudshield_token');
      localStorage.removeItem('fraudshield_refresh_token');
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
