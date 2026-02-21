import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import LoginView from './components/views/LoginView';
import { AppProvider, useApp } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';
import LoadingFallback from './components/LoadingFallback';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ToastContainer from './components/shared/ToastContainer';
import OfflineBanner from './components/shared/OfflineBanner';
import { ViewType } from './types';
import { canAccessView } from './config/accessControl';

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
const FinanceView = lazy(() => import('./components/views/FinanceView'));
const LegalView = lazy(() => import('./components/views/LegalView'));
const MarketplacePage = lazy(() => import('./pages/Marketplace'));
const IntegratorDashboard = lazy(() => import('./components/dashboards/IntegratorDashboard'));
const SupplierDashboard = lazy(() => import('./components/dashboards/SupplierDashboard'));
const TechnicianDashboard = lazy(() => import('./components/dashboards/TechnicianDashboard'));
const InvestorDashboard = lazy(() => import('./components/dashboards/InvestorDashboard'));
const UnauthorizedView = lazy(() => import('./components/views/UnauthorizedView'));

const PATH_TO_VIEW_MAP: Record<string, ViewType> = {
  '/dashboard': 'dashboard',
  '/architecture': 'architecture',
  '/data-dictionary': 'dataDictionary',
  '/operations': 'operations',
  '/flows': 'flows',
  '/events-matrix': 'eventsMatrix',
  '/system-config': 'systemConfig',
  '/property-registration': 'propertyRegistration',
  '/operational-action': 'operationalAction',
  '/contracts': 'contracts',
  '/sales': 'sales',
  '/financials': 'financials',
  '/account-control': 'accountControl',
  '/management': 'management',
  '/future-market': 'futureMarket',
  '/workforce': 'workforce',
  '/stock': 'stock',
  '/commercial': 'commercial',
  '/logistics': 'logistics',
  '/ai-analysis': 'aiAnalysis',
  '/live-handling': 'liveHandling',
  '/integrations': 'integrations',
  '/field-operations': 'fieldOperations',
  '/reports': 'reports',
  '/carbon-market': 'carbonMarket',
  '/custom-input-request': 'customInputRequest',
  '/operator-portal': 'operatorPortal',
  '/mobile-app': 'mobileApp',
  '/technician-portal': 'technicianPortal',
  '/investor-portal': 'investorPortal',
  '/supplier-portal': 'supplierPortal',
  '/integrator-portal': 'integratorPortal',
  '/finance': 'finance',
  '/legal': 'legal',
  '/marketplace': 'marketplace',
};

const resolveTargetView = (pathname: string): ViewType | null => {
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  const sortedEntries = Object.entries(PATH_TO_VIEW_MAP).sort((a, b) => b[0].length - a[0].length);
  const matchedRoute = sortedEntries.find(
    ([routePath]) => normalizedPath === routePath || normalizedPath.startsWith(`${routePath}/`)
  );
  return matchedRoute ? matchedRoute[1] : null;
};

const AuthenticationGuard = () => {
  const { currentUser } = useApp();
  const location = useLocation();
  return currentUser ? <Outlet /> : <Navigate replace state={{ from: location }} to="/login" />;
};

const AuthorizationGuard = () => {
  const { currentUser } = useApp();
  const location = useLocation();
  const targetView = location.pathname === '/' ? 'dashboard' : resolveTargetView(location.pathname);

  if (currentUser && targetView && !canAccessView(currentUser, targetView)) {
    return <Navigate replace to="/unauthorized" />;
  }

  return <Outlet />;
};

const supportsHoverPointer = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
};

const MainLayout = () => {
  const [isAutoHideSidebar, setAutoHideSidebar] = useState(supportsHoverPointer);
  const [isSidebarVisible, setSidebarVisible] = useState(() => !supportsHoverPointer());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

    const syncSidebarMode = (matches: boolean) => {
      setAutoHideSidebar(matches);
      setSidebarVisible(!matches);
    };

    syncSidebarMode(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      syncSidebarMode(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const showSidebar = () => {
    if (isAutoHideSidebar) {
      setSidebarVisible(true);
    }
  };

  const hideSidebar = () => {
    if (isAutoHideSidebar) {
      setSidebarVisible(false);
    }
  };

  return (
    <div className="relative flex h-screen bg-slate-100 font-sans">
      {isAutoHideSidebar && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-40 w-3"
          onMouseEnter={showSidebar}
        />
      )}
      <div
        className={`h-full overflow-hidden transition-[width] duration-200 ease-out ${
          isSidebarVisible ? 'w-64' : 'w-0'
        }`}
        onMouseEnter={showSidebar}
        onMouseLeave={hideSidebar}
      >
        <Sidebar />
      </div>
      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 md:p-8" onMouseEnter={hideSidebar}>
        <OfflineBanner />
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

const FullscreenLayout = ({ children }: { children: React.ReactNode }) => (
  <main className="h-screen overflow-y-auto">
    <OfflineBanner />
    <ErrorBoundary>
      <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
    </ErrorBoundary>
  </main>
);

const AppContent: React.FC = () => {
  const { currentUser, isAuthLoading } = useApp();

  if (isAuthLoading) {
    return (
      <FullscreenLayout>
        <LoadingFallback />
      </FullscreenLayout>
    );
  }

  const defaultRoute = currentUser?.role === 'Operador' ? '/operator-portal' : '/dashboard';

  return (
    <>
      <Routes>
        <Route element={<LoginView />} path="/login" />
        <Route element={<FullscreenLayout><PublicMarketView /></FullscreenLayout>} path="/public-market" />
        <Route element={<AuthenticationGuard />}>
          <Route element={<FullscreenLayout><UnauthorizedView /></FullscreenLayout>} path="/unauthorized" />
          <Route element={<AuthorizationGuard />}>
            <Route element={<MainLayout />}>
              <Route element={<Navigate replace to={defaultRoute} />} path="/" />
              <Route element={<DashboardView />} path="dashboard" />
              <Route element={<ArchitectureView />} path="architecture" />
              <Route element={<DataDictionaryView />} path="data-dictionary" />
              <Route element={<OperationsTableView />} path="operations" />
              <Route element={<LiquidationFlowsView />} path="flows" />
              <Route element={<EventsMatrixView />} path="events-matrix" />
              <Route element={<SystemConfigView />} path="system-config" />
              <Route element={<PropertyRegistrationView />} path="property-registration" />
              <Route element={<OperationalActionView />} path="operational-action" />
              <Route element={<ContractsView />} path="contracts" />
              <Route element={<SalesView />} path="sales" />
              <Route element={<FinancialsView />} path="financials" />
              <Route element={<AccountControlView />} path="account-control/:receivableId" />
              <Route element={<ManagementView />} path="management" />
              <Route element={<FutureMarketView />} path="future-market" />
              <Route element={<WorkforceView />} path="workforce" />
              <Route element={<StockView />} path="stock" />
              <Route element={<CommercialView />} path="commercial" />
              <Route element={<LogisticsView />} path="logistics" />
              <Route element={<AIAnalysisView />} path="ai-analysis" />
              <Route element={<LiveHandlingView />} path="live-handling" />
              <Route element={<IntegrationsView />} path="integrations" />
              <Route element={<FieldOperationsView />} path="field-operations" />
              <Route element={<ReportsView />} path="reports" />
              <Route element={<CarbonMarketView />} path="carbon-market" />
              <Route element={<CustomInputRequestView />} path="custom-input-request" />
              <Route element={<OperatorPortalView />} path="operator-portal" />
              <Route element={<TechnicianDashboard />} path="technician-portal" />
              <Route element={<InvestorDashboard />} path="investor-portal" />
              <Route element={<SupplierDashboard />} path="supplier-portal" />
              <Route element={<FinanceView />} path="finance" />
              <Route element={<LegalView />} path="legal" />
              <Route element={<MarketplacePage />} path="marketplace" />
              <Route element={<IntegratorDashboard />} path="integrator-portal" />
            </Route>
            <Route element={<FullscreenLayout><MobileAppView /></FullscreenLayout>} path="mobile-app" />
          </Route>
        </Route>
        <Route element={<Navigate replace to="/" />} path="*" />
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
