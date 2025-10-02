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
const BOQPageSimplified = React.lazy(() => import('./pages/BOQPageSimplified'));
const MaterialsPage = React.lazy(() => import('./pages/MaterialsPage'));
const WorksPage = React.lazy(() => import('./pages/WorksPage'));
const UsersPage = React.lazy(() => import('./pages/admin/UsersPage'));
const SettingsPage = React.lazy(() => import('./pages/admin/SettingsPage'));
const ConstructionCostsPage = React.lazy(() => import('./pages/admin/ConstructionCostsPage'));
const ConstructionCostsEditPage = React.lazy(() => import('./pages/ConstructionCostsEditPage'));
const TenderConstructionCostsPage = React.lazy(() => import('./pages/TenderConstructionCostsPage'));
const CostSelectorTest = React.lazy(() => import('./pages/admin/CostSelectorTest'));
const TestCostSearch = React.lazy(() => import('./pages/admin/TestCostSearch'));
const TestCostSearchAuto = React.lazy(() => import('./pages/admin/TestCostSearchAuto'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const WorkMaterialsPage = React.lazy(() => import('./pages/WorkMaterialsPage'));
const FinancialIndicatorsPage = React.lazy(() => import('./pages/FinancialIndicatorsPage'));
const CommercialCostsPage = React.lazy(() => import('./pages/CommercialCostsPage'));
const TestMarkupTable = React.lazy(() => import('./pages/admin/TestMarkupTable'));
const MarkupTablesSetup = React.lazy(() => import('./pages/admin/MarkupTablesSetup'));

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
                  <BOQPageSimplified />
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
                    <MaterialsPage />
                  </React.Suspense>
                }
              />
              <Route
                path="works"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <WorksPage />
                  </React.Suspense>
                } 
              />
              <Route 
                path="work-materials" 
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <WorkMaterialsPage />
                  </React.Suspense>
                } 
              />
            </Route>

            {/* Construction Costs routes */}
            <Route path="construction-costs">
              <Route
                path="tender"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <TenderConstructionCostsPage />
                  </React.Suspense>
                }
              />
              <Route
                path="management"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <ConstructionCostsPage />
                  </React.Suspense>
                }
              />
              <Route
                path="edit"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <ConstructionCostsEditPage />
                  </React.Suspense>
                }
              />
            </Route>

            {/* Financial Indicators route */}
            <Route 
              path="financial" 
              element={
                <React.Suspense fallback={<div>Загрузка...</div>}>
                  <FinancialIndicatorsPage />
                </React.Suspense>
              } 
            />

            {/* Financial Indicators direct access route */}
            <Route 
              path="financial-indicators" 
              element={
                <React.Suspense fallback={<div>Загрузка...</div>}>
                  <FinancialIndicatorsPage />
                </React.Suspense>
              } 
            />

            {/* Commercial Costs route */}
            <Route 
              path="commercial-costs" 
              element={
                <React.Suspense fallback={<div>Загрузка...</div>}>
                  <CommercialCostsPage />
                </React.Suspense>
              } 
            />


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
                path="cost-test"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <CostSelectorTest />
                  </React.Suspense>
                }
              />
              <Route
                path="cost-search-test"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <TestCostSearch />
                  </React.Suspense>
                }
              />
              <Route
                path="cost-search-auto"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <TestCostSearchAuto />
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
              <Route
                path="test-markup-table"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <TestMarkupTable />
                  </React.Suspense>
                } 
              />
              <Route
                path="markup-tables-setup"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <MarkupTablesSetup />
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