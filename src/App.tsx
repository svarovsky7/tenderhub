import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import { initConnectionMonitoring } from './lib/supabase/connection-status';
import './App.css';

// Lazy load pages for better performance
const TendersPage = React.lazy(() => import('./pages/TendersPage'));
const TenderBoq = React.lazy(() => import('./pages/TenderBoq'));
const BOQPage = React.lazy(() => import('./pages/BOQPage'));
const Materials = React.lazy(() => import('./pages/Materials'));
const Works = React.lazy(() => import('./pages/Works'));
const UsersPage = React.lazy(() => import('./pages/admin/UsersPage'));
const SettingsPage = React.lazy(() => import('./pages/admin/SettingsPage'));
const ConstructionCostsPage = React.lazy(() => import('./pages/admin/ConstructionCostsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));

function App() {
  // Initialize connection monitoring on app start
  useEffect(() => {
    console.log('🚀 TenderHub App starting...');
    initConnectionMonitoring();
  }, []);

  return (
    <ConfigProvider locale={ruRU}>
      <BrowserRouter>
        <Routes>
          {/* All routes with layout */}
          <Route path="/" element={<AppLayout />}>
            {/* Dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            {/* Tenders */}
            <Route 
              path="tenders/*" 
              element={
                <React.Suspense fallback={<div>Загрузка...</div>}>
                  <TendersPage />
                </React.Suspense>
              } 
            />

            {/* BOQ Management */}
            <Route 
              path="boq" 
              element={
                <React.Suspense fallback={<div>Загрузка...</div>}>
                  <BOQPage />
                </React.Suspense>
              } 
            />
            <Route 
              path="tender/:tenderId/boq" 
              element={
                <React.Suspense fallback={<div>Загрузка...</div>}>
                  <TenderBoq />
                </React.Suspense>
              } 
            />

            {/* Libraries */}
            <Route path="libraries">
              <Route 
                path="materials" 
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <Materials />
                  </React.Suspense>
                } 
              />
              <Route 
                path="works" 
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <Works />
                  </React.Suspense>
                } 
              />
            </Route>

            {/* Admin routes */}
            <Route path="admin">
              <Route
                path="users"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <UsersPage />
                  </React.Suspense>
                } 
              />
              <Route
                path="construction-costs"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <ConstructionCostsPage />
                  </React.Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <SettingsPage />
                  </React.Suspense>
                } 
              />
            </Route>

            {/* Profile */}
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
    </ConfigProvider>
  );
}

export default App;