import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import UnauthorizedPage from './pages/UnauthorizedPage';
import InactivePage from './pages/InactivePage';
import './App.css';

// Lazy load pages for better performance
const TendersPage = React.lazy(() => import('./pages/TendersPage'));
const TenderBoq = React.lazy(() => import('./pages/TenderBoq'));
const Materials = React.lazy(() => import('./pages/Materials'));
const Works = React.lazy(() => import('./pages/Works'));
const UsersPage = React.lazy(() => import('./pages/admin/UsersPage'));
const SettingsPage = React.lazy(() => import('./pages/admin/SettingsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

function App() {
  return (
    <ConfigProvider locale={ruRU}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/auth/login" element={<AuthPage />} />
            <Route path="/auth/register" element={<AuthPage />} />
            <Route path="/auth/inactive" element={<InactivePage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected routes with layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard - accessible to all authenticated users */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* Tenders - accessible based on permissions */}
              <Route 
                path="tenders/*" 
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <TendersPage />
                  </React.Suspense>
                } 
              />

              {/* BOQ Management - Engineer and Admin only */}
              <Route 
                path="tender/:tenderId/boq" 
                element={
                  <ProtectedRoute requiredRoles={['Administrator', 'Engineer']}>
                    <React.Suspense fallback={<div>Загрузка...</div>}>
                      <TenderBoq />
                    </React.Suspense>
                  </ProtectedRoute>
                } 
              />

              {/* Libraries - Engineer and Admin only */}
              <Route path="libraries">
                <Route 
                  path="materials" 
                  element={
                    <ProtectedRoute requiredRoles={['Administrator', 'Engineer']}>
                      <React.Suspense fallback={<div>Загрузка...</div>}>
                        <Materials />
                      </React.Suspense>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="works" 
                  element={
                    <ProtectedRoute requiredRoles={['Administrator', 'Engineer']}>
                      <React.Suspense fallback={<div>Загрузка...</div>}>
                        <Works />
                      </React.Suspense>
                    </ProtectedRoute>
                  } 
                />
              </Route>

              {/* Admin routes - Administrator only */}
              <Route path="admin">
                <Route 
                  path="users" 
                  element={
                    <ProtectedRoute requiredRoles={['Administrator']}>
                      <React.Suspense fallback={<div>Загрузка...</div>}>
                        <UsersPage />
                      </React.Suspense>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="settings" 
                  element={
                    <ProtectedRoute requiredRoles={['Administrator']}>
                      <React.Suspense fallback={<div>Загрузка...</div>}>
                        <SettingsPage />
                      </React.Suspense>
                    </ProtectedRoute>
                  } 
                />
              </Route>

              {/* Profile - accessible to all authenticated users */}
              <Route 
                path="profile" 
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <ProfilePage />
                  </React.Suspense>
                } 
              />
              <Route 
                path="settings" 
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <ProfilePage />
                  </React.Suspense>
                } 
              />
            </Route>

            {/* Catch all route - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
