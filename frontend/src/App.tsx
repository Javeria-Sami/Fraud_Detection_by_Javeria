import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/shared/ProtectedRoute';

// Lazy-loaded route components for high-performance bundle splitting
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const AccessDenied = lazy(() => import('./pages/AccessDenied').then(m => ({ default: m.AccessDenied })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Transactions = lazy(() => import('./pages/Transactions').then(m => ({ default: m.Transactions })));
const TransactionDetail = lazy(() => import('./pages/TransactionDetail').then(m => ({ default: m.TransactionDetail })));
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const AlertDetail = lazy(() => import('./pages/AlertDetail').then(m => ({ default: m.AlertDetail })));
const Cases = lazy(() => import('./pages/Cases').then(m => ({ default: m.Cases })));
const CaseDetail = lazy(() => import('./pages/CaseDetail').then(m => ({ default: m.CaseDetail })));
const RiskProfiles = lazy(() => import('./pages/RiskProfiles').then(m => ({ default: m.RiskProfiles })));
const HistoricalSearch = lazy(() => import('./pages/HistoricalSearch').then(m => ({ default: m.HistoricalSearch })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const Models = lazy(() => import('./pages/Models').then(m => ({ default: m.Models })));
const AdminOverview = lazy(() => import('./pages/AdminOverview').then(m => ({ default: m.AdminOverview })));
const AdminRules = lazy(() => import('./pages/AdminRules').then(m => ({ default: m.AdminRules })));
const AdminUsers = lazy(() => import('./pages/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminSettings = lazy(() => import('./pages/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const AdminObservability = lazy(() => import('./pages/AdminObservability').then(m => ({ default: m.AdminObservability })));
const UIComponentShowcase = lazy(() => import('./pages/UIComponentShowcase').then(m => ({ default: m.UIComponentShowcase })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-soc-muted font-mono">Loading View...</span>
    </div>
  </div>
);

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
            <Suspense fallback={<PageLoadingFallback />}>
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
                <Route path="/notifications" element={<Notifications />} />
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
                  path="/admin"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminOverview />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/overview"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminOverview />
                    </ProtectedRoute>
                  }
                />
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
                    <ProtectedRoute requiredRole={['admin', 'analyst']}>
                      <AuditLogs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/observability"
                  element={
                    <ProtectedRoute requiredRole="admin">
                      <AdminObservability />
                    </ProtectedRoute>
                  }
                />

                {/* Access Denied Route */}
                <Route path="/access-denied" element={<AccessDenied />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            </Suspense>
          </BrowserRouter>
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
