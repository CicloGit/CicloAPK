
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import LoginView from './components/views/LoginView';
import { AppProvider, useApp } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';
import LoadingSpinner from './components/shared/LoadingSpinner';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ToastContainer from './components/shared/ToastContainer';
import { ViewType } from './types';
import { roleAccessConfig } from './config/accessControl';

// Lazy load views
const ArchitectureView = lazy(() => import('./components/views/ArchitectureView'));
const DataDictionaryView = lazy(() => import('./components/views/DataDictionaryView'));
const OperationsTableView = lazy(() => import('./components/views/OperationsTableView'));
const LiquidationFlowsView = lazy(() => import('./components/views/LiquidationFlowsView'));
const DashboardView = lazy(() => import('./components/views/DashboardView'));
const EventsMatrixView = lazy(() => import('./components/views/EventsMatrixView'));
const SystemConfigView = lazy(() => import('./components/views/SystemConfigView'));
const PropertyRegistrationView = lazy(() => import('./components/views/PropertyRegistrationView'));
const OperationalActionView = lazy(() => import('./components/views/OperationalActionView'));
const ContractsView = lazy(() => import('./components/views/producer/ContractsView'));
const SalesView = lazy(() => import('./components/views/producer/SalesView'));
const FinancialsView = lazy(() => import('./components/views/producer/FinancialsView'));
const AccountControlView = lazy(() => import('./components/views/producer/AccountControlView'));
const ManagementView = lazy(() => import('./components/views/producer/ManagementView'));
const FutureMarketView = lazy(() => import('./components/views/producer/FutureMarketView'));
const WorkforceView = lazy(() => import('./components/views/producer/WorkforceView'));
const PublicMarketView = lazy(() => import('./components/views/public/PublicMarketView'));
const StockView = lazy(() => import('./components/views/module/StockView'));
const CommercialView = lazy(() => import('./components/views/module/CommercialView'));
const LogisticsView = lazy(() => import('./components/views/module/LogisticsView'));
const AIAnalysisView = lazy(() => import('./components/views/module/AIAnalysisView'));
const LiveHandlingView = lazy(() => import('./components/views/producer/LiveHandlingView'));
const OperatorPortalView = lazy(() => import('./components/views/operator/OperatorPortalView'));
const IntegrationsView = lazy(() => import('./components/views/IntegrationsView'));
const FieldOperationsView = lazy(() => import('./components/views/producer/FieldOperationsView'));
const ReportsView = lazy(() => import('./components/views/producer/ReportsView'));
const CarbonMarketView = lazy(() => import('./components/views/producer/CarbonMarketView'));
const CustomInputRequestView = lazy(() => import('./components/views/producer/CustomInputRequestView'));
const MobileAppView = lazy(() => import('./components/views/mobile/MobileAppView'));
const ModuleView = lazy(() => import('./components/views/ModuleView'));
const FinanceView = lazy(() => import('./components/views/FinanceView'));
const LegalView = lazy(() => import('./components/views/LegalView'));
const IntegratorDashboard = lazy(() => import('./components/dashboards/IntegratorDashboard'));
const SupplierDashboard = lazy(() => import('./components/dashboards/SupplierDashboard'));
const TechnicianDashboard = lazy(() => import('./components/dashboards/TechnicianDashboard'));
const InvestorDashboard = lazy(() => import('./components/dashboards/InvestorDashboard'));
const UnauthorizedView = lazy(() => import('./components/views/UnauthorizedView'));

// Maps URL paths to ViewType for authorization checks
const PATH_TO_VIEW_MAP: Record<string, ViewType> = {
    '/dashboard': 'dashboard', '/architecture': 'architecture', '/data-dictionary': 'dataDictionary', '/operations': 'operations', '/flows': 'flows', '/events-matrix': 'eventsMatrix', '/system-config': 'systemConfig', '/property-registration': 'propertyRegistration', '/operational-action': 'operationalAction', '/contracts': 'contracts', '/sales': 'sales', '/financials': 'financials', '/account-control': 'accountControl', '/management': 'management', '/future-market': 'futureMarket', '/workforce': 'workforce', '/stock': 'stock', '/commercial': 'commercial', '/logistics': 'logistics', '/ai-analysis': 'aiAnalysis', '/live-handling': 'liveHandling', '/integrations': 'integrations', '/field-operations': 'fieldOperations', '/reports': 'reports', '/carbon-market': 'carbonMarket', '/custom-input-request': 'customInputRequest', '/operator-portal': 'operatorPortal', '/mobile-app': 'mobileApp', '/technician-portal': 'technicianPortal', '/investor-portal': 'investorPortal', '/supplier-portal': 'supplierPortal', '/integrator-portal': 'integratorPortal', '/finance': 'finance', '/legal': 'legal'
};

// --- AUTH GUARDS ---
const AuthenticationGuard = () => {
  const { currentUser } = useApp();
  const location = useLocation();
  return currentUser ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
};

const AuthorizationGuard = () => {
    const { currentUser } = useApp();
    const location = useLocation();
    const basePath = '/' + location.pathname.split('/')[1];
    const targetView = (basePath === '/' || basePath === '') ? 'dashboard' : PATH_TO_VIEW_MAP[basePath];
    if (currentUser && targetView) {
        const allowedViews = roleAccessConfig[currentUser.role];
        if (!allowedViews || !allowedViews.includes(targetView)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }
    return <Outlet />;
};

// --- LAYOUTS ---
const MainLayout = () => (
  <div className="flex h-screen bg-slate-100 font-sans">
    <Sidebar />
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
      <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner text="Carregando modulo..." />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </main>
  </div>
);

const FullscreenLayout = ({ children }: { children: React.ReactNode }) => (
    <main className="h-screen overflow-y-auto">
        <ErrorBoundary>
            <Suspense fallback={<LoadingSpinner text="Carregando..." />}>
                {children}
            </Suspense>
        </ErrorBoundary>
    </main>
);

const AppContent: React.FC = () => {
    const { currentUser, isAuthLoading } = useApp();

    if (isAuthLoading) {
        return (
            <FullscreenLayout>
                <LoadingSpinner text="Validando sessao..." />
            </FullscreenLayout>
        );
    }

    const defaultRoute = currentUser?.role === 'Operador' ? '/operator-portal' : '/dashboard';

    return (
        <>
            <Routes>
                <Route path="/login" element={<LoginView />} />
                <Route path="/public-market" element={<FullscreenLayout><PublicMarketView /></FullscreenLayout>} />
                <Route element={<AuthenticationGuard />}>
                    <Route path="/unauthorized" element={<FullscreenLayout><UnauthorizedView /></FullscreenLayout>} />
                    <Route element={<AuthorizationGuard />}>
                        <Route element={<MainLayout />}>
                            <Route path="/" element={<Navigate to={defaultRoute} replace />} />
                            <Route path="dashboard" element={<DashboardView />} />
                            <Route path="architecture" element={<ArchitectureView />} />
                            <Route path="data-dictionary" element={<DataDictionaryView />} />
                            <Route path="operations" element={<OperationsTableView />} />
                            <Route path="flows" element={<LiquidationFlowsView />} />
                            <Route path="events-matrix" element={<EventsMatrixView />} />
                            <Route path="system-config" element={<SystemConfigView />} />
                            <Route path="property-registration" element={<PropertyRegistrationView />} />
                            <Route path="operational-action" element={<OperationalActionView />} />
                            <Route path="contracts" element={<ContractsView />} />
                            <Route path="sales" element={<SalesView />} />
                            <Route path="financials" element={<FinancialsView />} />
                            <Route path="account-control/:receivableId" element={<AccountControlView />} />
                            <Route path="management" element={<ManagementView />} />
                            <Route path="future-market" element={<FutureMarketView />} />
                            <Route path="workforce" element={<WorkforceView />} />
                            <Route path="stock" element={<StockView />} />
                            <Route path="commercial" element={<CommercialView />} />
                            <Route path="logistics" element={<LogisticsView />} />
                            <Route path="ai-analysis" element={<AIAnalysisView />} />
                            <Route path="live-handling" element={<LiveHandlingView />} />
                            <Route path="integrations" element={<IntegrationsView />} />
                            <Route path="field-operations" element={<FieldOperationsView />} />
                            <Route path="reports" element={<ReportsView />} />
                            <Route path="carbon-market" element={<CarbonMarketView />} />
                            <Route path="custom-input-request" element={<CustomInputRequestView />} />
                            <Route path="operator-portal" element={<OperatorPortalView />} />
                            <Route path="technician-portal" element={<TechnicianDashboard />} />
                            <Route path="investor-portal" element={<InvestorDashboard />} />
                            <Route path="supplier-portal" element={<SupplierDashboard />} />
                            <Route path="finance" element={<FinanceView />} />
                            <Route path="legal" element={<LegalView />} />
                            <Route path="integrator-portal" element={<IntegratorDashboard />} />
                        </Route>
                        <Route path="mobile-app" element={<FullscreenLayout><MobileAppView /></FullscreenLayout>} />
                    </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ToastContainer />
        </>
    );
};

const App: React.FC = () => (
    <ToastProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ToastProvider>
);

export default App;
