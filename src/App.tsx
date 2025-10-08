import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme as antdTheme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import { initConnectionMonitoring } from './lib/supabase/connection-status';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import './App.css';

// Lazy load pages for better performance
const HomePage = React.lazy(() => import('./pages/HomePage'));
const TendersPage = React.lazy(() => import('./pages/TendersPage'));
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
const CostRedistributionPage = React.lazy(() => import('./pages/CostRedistributionPage'));
const TestMarkupTable = React.lazy(() => import('./pages/admin/TestMarkupTable'));
const MarkupTablesSetup = React.lazy(() => import('./pages/admin/MarkupTablesSetup'));
const TenderMaterialsWorksPage = React.lazy(() => import('./pages/TenderMaterialsWorksPage'));
const NomenclaturesPage = React.lazy(() => import('./pages/admin/NomenclaturesPage'));
const LibrariesPage = React.lazy(() => import('./pages/LibrariesPage'));
const LibrariesMaterialsWorksPage = React.lazy(() => import('./pages/LibrariesMaterialsWorksPage'));
const CommercePage = React.lazy(() => import('./pages/CommercePage'));
const ConstructionCostsIndexPage = React.lazy(() => import('./pages/ConstructionCostsIndexPage'));
const AdminIndexPage = React.lazy(() => import('./pages/AdminIndexPage'));

// Inner component that uses theme
const AppContent: React.FC = () => {
  const { theme } = useTheme();

  // Initialize connection monitoring on app start
  useEffect(() => {
    console.log('🚀 TenderHub App starting...');
    initConnectionMonitoring();
  }, []);

  // Configure Ant Design theme
  const antdConfig = {
    locale: ruRU,
    theme: {
      algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      token: {
        colorPrimary: '#1890ff',
        borderRadius: 8,
        // Custom tokens for better dark mode
        ...(theme === 'dark' ? {
          colorBgContainer: '#1f1f1f',
          colorBgElevated: '#262626',
          colorBgLayout: '#141414',
          colorBorder: '#424242',
          colorText: 'rgba(255, 255, 255, 0.85)',
          colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
          colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
        } : {}),
      },
    },
  };

  return (
    <ConfigProvider {...antdConfig}>
      <BrowserRouter>
        <Routes>
          {/* All routes with layout */}
          <Route path="/" element={<AppLayout />}>
            {/* Home Page */}
            <Route
              index
              element={
                <React.Suspense fallback={<div>Загрузка...</div>}>
                  <HomePage />
                </React.Suspense>
              }
            />

            {/* Dashboard */}
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

            {/* Commerce Section */}
            <Route
              path="commerce"
              element={
                <React.Suspense fallback={<div>Загрузка...</div>}>
                  <CommercePage />
                </React.Suspense>
              }
            />

            {/* Libraries */}
            <Route path="libraries">
              <Route
                index
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <LibrariesPage />
                  </React.Suspense>
                }
              />
              <Route
                path="materials-works"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <LibrariesMaterialsWorksPage />
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
              <Route
                path="tender-materials-works"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <TenderMaterialsWorksPage />
                  </React.Suspense>
                }
              />
            </Route>

            {/* Construction Costs routes */}
            <Route path="construction-costs">
              <Route
                index
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <ConstructionCostsIndexPage />
                  </React.Suspense>
                }
              />
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

            {/* Cost Redistribution (Перекидка) route */}
            <Route
              path="cost-redistribution"
              element={
                <React.Suspense fallback={<div>Загрузка...</div>}>
                  <CostRedistributionPage />
                </React.Suspense>
              }
            />


            {/* Admin routes */}
            <Route path="admin">
              <Route
                index
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <AdminIndexPage />
                  </React.Suspense>
                }
              />
              <Route
                path="nomenclatures"
                element={
                  <React.Suspense fallback={<div>Загрузка...</div>}>
                    <NomenclaturesPage />
                  </React.Suspense>
                }
              />
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
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;