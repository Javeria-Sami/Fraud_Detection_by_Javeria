import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { AccessDenied } from './pages/AccessDenied';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { TransactionDetail } from './pages/TransactionDetail';
import { Alerts } from './pages/Alerts';
import { AlertDetail } from './pages/AlertDetail';
import { Cases } from './pages/Cases';
import { CaseDetail } from './pages/CaseDetail';
import { RiskProfiles } from './pages/RiskProfiles';
import { HistoricalSearch } from './pages/HistoricalSearch';
import { Analytics } from './pages/Analytics';
import { Models } from './pages/Models';
import { AdminRules } from './pages/AdminRules';
import { AdminUsers } from './pages/AdminUsers';
import { AdminSettings } from './pages/AdminSettings';
import { AuditLogs } from './pages/AuditLogs';
import { UIComponentShowcase } from './pages/UIComponentShowcase';

const ProtectedRouteWrapper: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-soc-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-soc-muted font-mono">Initializing SOC Shell...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Application Shell */}
              <Route element={<ProtectedRouteWrapper />}>
                {/* Common Protected Routes */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/transactions/:id" element={<TransactionDetail />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/alerts/:id" element={<AlertDetail />} />
                <Route path="/risk-profiles" element={<RiskProfiles />} />
                <Route path="/search" element={<HistoricalSearch />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/models" element={<Models />} />
                <Route path="/ui-components" element={<UIComponentShowcase />} />

                {/* Investigation Routes (Analyst & Admin) */}
                <Route
                  path="/cases"
                  element={
                    <ProtectedRoute requiredRole={['admin', 'analyst']}>
                      <Cases />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cases/:id"
                  element={
                    <ProtectedRoute requiredRole={['admin', 'analyst']}>
                      <CaseDetail />
                    </ProtectedRoute>
                  }
                />

                {/* Administration Routes (Admin Only) */}
                <Route
                  path="/admin/rules"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminRules />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/audit-logs"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AuditLogs />
                    </ProtectedRoute>
                  }
                />

                {/* Access Denied Route */}
                <Route path="/access-denied" element={<AccessDenied />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
