
import React, { lazy } from 'react';
import { ViewType } from '../types';
import { featureMap } from '../constants';

// Lazy load all views to split the bundle
const ArchitectureView = lazy(() => import('../components/views/ArchitectureView'));
const DataDictionaryView = lazy(() => import('../components/views/DataDictionaryView'));
const OperationsTableView = lazy(() => import('../components/views/OperationsTableView'));
const LiquidationFlowsView = lazy(() => import('../components/views/LiquidationFlowsView'));
const DashboardView = lazy(() => import('../components/views/DashboardView'));
const ModuleView = lazy(() => import('../components/views/ModuleView'));
const EventsMatrixView = lazy(() => import('../components/views/EventsMatrixView'));
const SystemConfigView = lazy(() => import('../components/views/SystemConfigView'));
const PropertyRegistrationView = lazy(() => import('../components/views/PropertyRegistrationView'));
const OperationalActionView = lazy(() => import('../components/views/OperationalActionView'));
const ContractsView = lazy(() => import('../components/views/producer/ContractsView'));
const SalesView = lazy(() => import('../components/views/producer/SalesView'));
const FinancialsView = lazy(() => import('../components/views/producer/FinancialsView'));
const AccountControlView = lazy(() => import('../components/views/producer/AccountControlView'));
const ManagementView = lazy(() => import('../components/views/producer/ManagementView'));
const FutureMarketView = lazy(() => import('../components/views/producer/FutureMarketView'));
const WorkforceView = lazy(() => import('../components/views/producer/WorkforceView'));
const PublicMarketView = lazy(() => import('../components/views/public/PublicMarketView'));
const StockView = lazy(() => import('../components/views/module/StockView'));
const CommercialView = lazy(() => import('../components/views/module/CommercialView'));
const LogisticsView = lazy(() => import('../components/views/module/LogisticsView'));
const IntegratorDashboard = lazy(() => import('../components/dashboards/IntegratorDashboard'));
const AIAnalysisView = lazy(() => import('../components/views/module/AIAnalysisView'));
const LiveHandlingView = lazy(() => import('../components/views/producer/LiveHandlingView'));
const OperatorPortalView = lazy(() => import('../components/views/operator/OperatorPortalView'));
const IntegrationsView = lazy(() => import('../components/views/IntegrationsView'));
const FieldOperationsView = lazy(() => import('../components/views/producer/FieldOperationsView'));
const ReportsView = lazy(() => import('../components/views/producer/ReportsView'));
const CarbonMarketView = lazy(() => import('../components/views/producer/CarbonMarketView'));
const CustomInputRequestView = lazy(() => import('../components/views/producer/CustomInputRequestView'));
const MobileAppView = lazy(() => import('../components/views/mobile/MobileAppView'));

interface RouteConfig {
  component: React.ComponentType<any>;
  requiresAuth?: boolean;
  props?: Record<string, any>;
  isModulePlaceholder?: boolean;
}

export const getRouteConfig = (view: ViewType): RouteConfig | null => {
  // Generic Module Placeholder Logic
  if (['producerPortal', 'technicianPortal', 'investorPortal', 'supplierPortal', 'finance', 'legal'].includes(view)) {
     if (view === 'producerPortal') return { component: DashboardView, requiresAuth: true };
     const viewData = featureMap[view];
     return { 
       component: ModuleView, 
       props: { title: viewData?.title, features: viewData?.features } 
     };
  }

  const routes: Partial<Record<ViewType, RouteConfig>> = {
    mobileApp: { component: MobileAppView },
    publicMarket: { component: PublicMarketView },
    dashboard: { component: DashboardView, requiresAuth: true },
    architecture: { component: ArchitectureView },
    dataDictionary: { component: DataDictionaryView },
    operations: { component: OperationsTableView },
    flows: { component: LiquidationFlowsView },
    eventsMatrix: { component: EventsMatrixView },
    systemConfig: { component: SystemConfigView },
    propertyRegistration: { component: PropertyRegistrationView },
    operationalAction: { component: OperationalActionView, requiresAuth: true },
    contracts: { component: ContractsView },
    sales: { component: SalesView },
    financials: { component: FinancialsView },
    accountControl: { component: AccountControlView },
    management: { component: ManagementView },
    futureMarket: { component: FutureMarketView },
    workforce: { component: WorkforceView },
    liveHandling: { component: LiveHandlingView },
    fieldOperations: { component: FieldOperationsView },
    reports: { component: ReportsView },
    carbonMarket: { component: CarbonMarketView },
    customInputRequest: { component: CustomInputRequestView },
    operatorPortal: { component: OperatorPortalView },
    stock: { component: StockView },
    commercial: { component: CommercialView },
    logistics: { component: LogisticsView },
    integratorPortal: { component: IntegratorDashboard },
    aiAnalysis: { component: AIAnalysisView },
    integrations: { component: IntegrationsView },
  };

  return routes[view] || null;
};
