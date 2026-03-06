import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ProductionProject, ViewType } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { canAccessView } from '../../config/accessControl';
import { getSectorSettings, isMilkModuleSupportedBySector, resolveActivityScopedViews } from '../../config/sectorUtils';
import { propertyService } from '../../services/propertyService';

// Icons
import HomeIcon from '../icons/HomeIcon';
import { CubeIcon } from '../icons/CubeIcon';
import { CashIcon } from '../icons/CashIcon';
import { TagIcon } from '../icons/TagIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import { LogoutIcon } from '../icons/LogoutIcon';
import DocumentReportIcon from '../icons/DocumentReportIcon';
import ShoppingCartIcon from '../icons/ShoppingCartIcon';
import CurrencyDollarIcon from '../icons/CurrencyDollarIcon';
import BeakerIcon from '../icons/BeakerIcon';
import UsersIcon from '../icons/UsersIcon';
import TrendingUpIcon from '../icons/TrendingUpIcon';
import SparklesIcon from '../icons/SparklesIcon';
import QrCodeIcon from '../icons/QrCodeIcon';
import ClipboardListIcon from '../icons/ClipboardListIcon';
import PuzzleIcon from '../icons/PuzzleIcon';
import ChartBarIcon from '../icons/ChartBarIcon';
import MapIcon from '../icons/MapIcon';
import TruckIcon from '../icons/TruckIcon';
import LeafIcon from '../icons/LeafIcon';
import FlaskIcon from '../icons/FlaskIcon';
import DiagramIcon from '../icons/DiagramIcon';
import BookIcon from '../icons/BookIcon';
import TableIcon from '../icons/TableIcon';
import FlowIcon from '../icons/FlowIcon';
import CodeIcon from '../icons/CodeIcon';

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const VIEW_ICONS: Record<string, any> = {
  dashboard: HomeIcon,
  financials: CurrencyDollarIcon,
  stock: CubeIcon,
  commercial: TagIcon,
  sales: ShoppingCartIcon,
  logistics: TruckIcon,
  logisticsPortal: TruckIcon,
  auctionPortal: TagIcon,
  auctionBidControl: ClipboardListIcon,
  milkControl: FlaskIcon,
  propertyRegistration: MapIcon,
  reports: ChartBarIcon,
  fieldOperations: ClipboardListIcon,
  liveHandling: QrCodeIcon,
  mobileApp: QrCodeIcon,
  management: BeakerIcon,
  workforce: UsersIcon,
  workforceEmployees: UsersIcon,
  workforceTime: ClipboardListIcon,
  workforcePayroll: CurrencyDollarIcon,
  workforcePpe: FlaskIcon,
  workforceOperatorAccess: BriefcaseIcon,
  contracts: DocumentReportIcon,
  futureMarket: TrendingUpIcon,
  carbonMarket: LeafIcon,
  customInputRequest: FlaskIcon,
  aiAnalysis: SparklesIcon,
  moduleGovernance: CodeIcon,
  integrations: PuzzleIcon,
  architecture: DiagramIcon,
  dataDictionary: BookIcon,
  operations: TableIcon,
  flows: FlowIcon,
  screenFlows: FlowIcon,
  systemConfig: DiagramIcon,
  producerPortal: BriefcaseIcon,
  technicianPortal: BriefcaseIcon,
  investorPortal: BriefcaseIcon,
  supplierPortal: BriefcaseIcon,
  integratorPortal: BriefcaseIcon,
  finance: CashIcon,
  legal: BriefcaseIcon,
  externalMarketplace: ShoppingCartIcon,
};

const viewToPath = (view: ViewType) => `/${view.replace(/([A-Z])/g, '-$1').toLowerCase()}`;

const roleNeedsActivityContext = (role: string): boolean => {
  const normalized = role
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return !['gestor', 'administrador', 'investidor', 'operador'].includes(normalized);
};

const normalizePath = (path: string): string => (path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path);

const isPathCoveredByAllowedRoutes = (pathname: string, allowedRoutes: string[]): boolean => {
  const normalized = normalizePath(pathname);
  return allowedRoutes.some((route) => normalized === route || normalized.startsWith(`${route}/`));
};

const Sidebar: React.FC = () => {
  const { currentUser, logout, selectedProductionId, setSelectedProductionId } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProductionProject[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setProjects([]);
      return;
    }

    let mounted = true;

    const loadProjects = async () => {
      try {
        const items = await propertyService.listProductionProjects();
        if (mounted) {
          setProjects(items);
        }
      } catch {
        if (mounted) {
          setProjects([]);
        }
      }
    };

    void loadProjects();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  if (!currentUser) return null;

  const shouldShowActivitySelector = roleNeedsActivityContext(currentUser.role);
  const selectedProduction = projects.find((p) => p.id === selectedProductionId);
  const sectorSettings = getSectorSettings(selectedProduction?.type);
  const activityScopedViews = useMemo(
    () => resolveActivityScopedViews(selectedProduction?.type),
    [selectedProduction?.type]
  );

  const isViewAllowed = (viewId: string) => {
    const view = viewId as ViewType;
    if (!canAccessView(currentUser, view)) {
      return false;
    }

    if (
      shouldShowActivitySelector &&
      currentUser.role === 'Produtor' &&
      selectedProductionId &&
      !activityScopedViews.includes(view)
    ) {
      return false;
    }

    return true;
  };

  const baseProducerSubNav = sectorSettings.navigation.filter((item) => isViewAllowed(item.view)).map((item) => ({
    id: item.view,
    label: item.label,
    icon: VIEW_ICONS[item.view] || BriefcaseIcon,
    path: viewToPath(item.view),
  }));

  const producerSubNav = [...baseProducerSubNav];
  if (
    isViewAllowed('milkControl') &&
    isMilkModuleSupportedBySector(selectedProduction?.type) &&
    !producerSubNav.some((item) => item.id === 'milkControl')
  ) {
    producerSubNav.push({
      id: 'milkControl',
      label: 'Controle de Leite (kg)',
      icon: FlaskIcon,
      path: '/milk-control',
    });
  }
  const producerRhNav: Array<{ id: ViewType; label: string; icon: React.FC<{ className?: string }>; path: string }> = [
    { id: 'workforceEmployees' as ViewType, label: 'RH - Colaboradores', icon: UsersIcon, path: '/workforce-employees' },
    { id: 'workforceTime' as ViewType, label: 'RH - Ponto e Turno', icon: ClipboardListIcon, path: '/workforce-time' },
    { id: 'workforcePayroll' as ViewType, label: 'RH - Folha', icon: CurrencyDollarIcon, path: '/workforce-payroll' },
    { id: 'workforcePpe' as ViewType, label: 'RH - SST e EPI', icon: FlaskIcon, path: '/workforce-ppe' },
    { id: 'workforceOperatorAccess' as ViewType, label: 'RH - Operador', icon: BriefcaseIcon, path: '/workforce-operator-access' },
  ].filter((item) => isViewAllowed(item.id));
  producerRhNav.forEach((item) => {
    if (!producerSubNav.some((existing) => existing.id === item.id)) {
      producerSubNav.push(item);
    }
  });
  const producerGovernanceNav = [
    { id: 'moduleGovernance', label: 'Modulos Reais', icon: CodeIcon, path: '/module-governance' },
    { id: 'integrations', label: 'Integracoes', icon: PuzzleIcon, path: '/integrations' },
    { id: 'screenFlows', label: 'Fluxos de Telas', icon: FlowIcon, path: '/screen-flows' },
    { id: 'externalMarketplace', label: 'Loja Externa API', icon: ShoppingCartIcon, path: '/external-marketplace' },
  ].filter((item) => isViewAllowed(item.id));
  const producerAllowedRoutes = useMemo(
    () => [
      '/dashboard',
      '/property-registration',
      ...producerSubNav.map((item) => item.path),
      ...producerGovernanceNav.map((item) => item.path),
    ],
    [producerSubNav, producerGovernanceNav]
  );

  const isProducerSubNavActive = producerSubNav.some((item) => location.pathname.startsWith(item.path));
  const isProducerGovernanceActive = producerGovernanceNav.some((item) => location.pathname.startsWith(item.path));
  const [isProducerNavOpen, setProducerNavOpen] = useState(isProducerSubNavActive || isProducerGovernanceActive);

  useEffect(() => {
    setProducerNavOpen(isProducerSubNavActive || isProducerGovernanceActive);
  }, [isProducerSubNavActive, isProducerGovernanceActive]);

  useEffect(() => {
    if (!shouldShowActivitySelector || currentUser.role !== 'Produtor') {
      return;
    }

    if (projects.length === 0) {
      if (selectedProductionId) {
        setSelectedProductionId(null);
      }
      if (location.pathname !== '/property-registration') {
        navigate('/activity-context', { replace: true });
      }
      return;
    }

    if (!selectedProductionId) {
      return;
    }

    if (!selectedProduction) {
      setSelectedProductionId(null);
      navigate('/activity-context', { replace: true });
      return;
    }

    if (!isPathCoveredByAllowedRoutes(location.pathname, producerAllowedRoutes)) {
      navigate('/dashboard', { replace: true });
    }
  }, [
    shouldShowActivitySelector,
    currentUser.role,
    projects,
    selectedProductionId,
    selectedProduction,
    location.pathname,
    producerAllowedRoutes,
    navigate,
    setSelectedProductionId,
  ]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `w-full text-left flex items-center p-2.5 my-1 rounded-xl transition-colors duration-200 ${
      isActive
        ? 'bg-slate-900 text-white shadow-[0_8px_24px_rgba(15,23,42,0.22)]'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `w-full text-left flex items-center p-2 my-1 rounded-lg transition-colors duration-200 text-xs ${
      isActive ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const normalizedRole = String(currentUser.role)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const rolePrimaryItems = (() => {
    const base = [{ id: 'dashboard', label: 'Painel', path: '/dashboard' }];
    if (normalizedRole.includes('tecnico')) {
      return [
        ...base,
        { id: 'technicianPortal', label: 'Portal Tecnico', path: '/technician-portal' },
        { id: 'liveHandling', label: 'Manejo de Campo', path: '/live-handling' },
        { id: 'mobileApp', label: 'App Mobile', path: '/mobile-app' },
        { id: 'milkControl', label: 'Controle de Leite', path: '/milk-control' },
        { id: 'producerPortal', label: 'Portal do Produtor', path: '/dashboard' },
      ];
    }
    if (normalizedRole.includes('fornecedor')) {
      return [
        ...base,
        { id: 'supplierPortal', label: 'Portal do Fornecedor', path: '/supplier-portal' },
        { id: 'stock', label: 'Estoque', path: '/stock' },
        { id: 'logisticsPortal', label: 'Portal Logistico', path: '/logistics-portal' },
      ];
    }
    if (normalizedRole.includes('integradora')) {
      return [
        ...base,
        { id: 'integratorPortal', label: 'Portal da Integradora', path: '/integrator-portal' },
        { id: 'contracts', label: 'Contratos', path: '/contracts' },
        { id: 'commercial', label: 'Comercial', path: '/commercial' },
        { id: 'logisticsPortal', label: 'Portal Logistico', path: '/logistics-portal' },
      ];
    }
    if (normalizedRole.includes('leiloeiro')) {
      return [
        ...base,
        { id: 'auctionPortal', label: 'Portal do Leiloeiro', path: '/auction-portal' },
        { id: 'auctionBidControl', label: 'Controle de Lances', path: '/auction-bid-control' },
        { id: 'sales', label: 'Comercial e Vendas', path: '/sales' },
      ];
    }
    if (normalizedRole.includes('trafego')) {
      return [
        ...base,
        { id: 'logisticsPortal', label: 'Portal Logistico', path: '/logistics-portal' },
        { id: 'logistics', label: 'Logistica', path: '/logistics' },
      ];
    }
    if (normalizedRole.includes('investidor')) {
      return [
        ...base,
        { id: 'investorPortal', label: 'Portal do Investidor', path: '/investor-portal' },
        { id: 'finance', label: 'Financeiro', path: '/finance' },
      ];
    }
    if (normalizedRole.includes('operador')) {
      return [
        { id: 'mobileApp', label: 'App Mobile', path: '/mobile-app' },
        { id: 'operatorPortal', label: 'Portal do Operador', path: '/operator-portal' },
        { id: 'auctionPortal', label: 'Lances Online', path: '/auction-portal' },
        { id: 'auctionBidControl', label: 'Fila de Lances', path: '/auction-bid-control' },
        { id: 'liveHandling', label: 'Manejo de Campo', path: '/live-handling' },
      ];
    }
    return base;
  })();

  const navSections = [
    { title: 'Principal', items: rolePrimaryItems },
    {
      title: 'Sistema',
      items: [
        { id: 'mobileApp', label: 'App Mobile', path: '/mobile-app' },
        { id: 'moduleGovernance', label: 'Modulos Reais', path: '/module-governance' },
        { id: 'integrations', label: 'Integracoes', path: '/integrations' },
        { id: 'screenFlows', label: 'Fluxos de Telas', path: '/screen-flows' },
        { id: 'externalMarketplace', label: 'Loja Externa API', path: '/external-marketplace' },
        { id: 'architecture', label: 'Arquitetura', path: '/architecture' },
      ],
    },
  ];

  const renderNavForRole = () => {
    if (currentUser.role === 'Produtor') {
      return (
        <div>
          <button
            onClick={() => setProducerNavOpen(!isProducerNavOpen)}
            className={`w-full text-left flex items-center p-2.5 my-1 rounded-xl transition-colors duration-200 ${
              isProducerSubNavActive
                ? 'bg-slate-900 text-white shadow-[0_8px_24px_rgba(15,23,42,0.22)]'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BriefcaseIcon className="h-6 w-6 mr-3 flex-shrink-0" />
            <span className="text-sm">Gestao da Producao</span>
            <ChevronDownIcon className={`h-4 w-4 ml-auto transition-transform ${isProducerNavOpen ? 'rotate-180' : ''}`} />
          </button>
          {isProducerNavOpen && (
            <div className="pl-6 border-l-2 border-slate-200 ml-3 animate-slide-down">
              <ul>
                {producerSubNav.map((subItem) => (
                  <li key={subItem.id}>
                    <NavLink to={subItem.path} className={subNavLinkClass} end>
                      <subItem.icon className="h-5 w-5 mr-2 flex-shrink-0" />
                      <span>{subItem.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
              {producerGovernanceNav.length > 0 && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Governanca</p>
                  <ul className="mt-1">
                    {producerGovernanceNav.map((subItem) => (
                      <li key={subItem.id}>
                        <NavLink to={subItem.path} className={subNavLinkClass}>
                          <subItem.icon className="h-5 w-5 mr-2 flex-shrink-0" />
                          <span>{subItem.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Default navigation for other roles
    return navSections.map((section) => (
      <div key={section.title}>
        <h2 className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{section.title}</h2>
        <ul>
          {section.items
            .filter((item) => isViewAllowed(item.id))
            .map((item) => (
              <li key={item.id}>
                <NavLink to={item.path} className={navLinkClass}>
                  <div className="h-6 w-6 mr-3 flex-shrink-0">
                    {React.createElement(VIEW_ICONS[item.id] || BriefcaseIcon)}
                  </div>
                  <span className="text-sm">{item.label}</span>
                </NavLink>
              </li>
            ))}
        </ul>
      </div>
    ));
  };

  return (
    <aside className="w-full md:w-64 bg-white text-slate-700 flex flex-col h-full border-r border-slate-200 shadow-[0_0_0_1px_rgba(15,23,42,0.04)] md:bg-white/86 md:border-slate-200/80 md:backdrop-blur-2xl">
      <div className="p-6 border-b border-slate-200 md:border-slate-200/80">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Ciclo<span className="text-teal-600">+</span>
        </h1>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mt-1">ERP Agro</p>
      </div>
      <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar">{renderNavForRole()}</nav>
      <div className="p-4 border-t border-slate-200 bg-white md:border-slate-200/80 md:bg-white/75">
        {shouldShowActivitySelector && (
          <div className="mb-3">
            <label htmlFor="activity-context-select" className="block text-[10px] uppercase tracking-wider text-slate-400">
              Atividade desta sessao
            </label>
            <select
              id="activity-context-select"
              value={selectedProductionId ?? ''}
              onChange={(event) => {
                const nextId = event.target.value || null;
                setSelectedProductionId(nextId);
                navigate(nextId ? '/dashboard' : '/activity-context');
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-700"
            >
              <option value="">Selecionar atividade</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => navigate('/activity-context')}
              className="mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
            >
              Alterar contexto de atividade
            </button>
            <button
              type="button"
              onClick={() => navigate('/property-registration')}
              className="mt-1 block text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              Cadastrar propriedade/atividade
            </button>
          </div>
        )}
        {selectedProduction && shouldShowActivitySelector && (
          <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Atividade ativa</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{selectedProduction.name}</p>
            <p className="text-[10px] text-slate-500 uppercase mt-1">{selectedProduction.type}</p>
          </div>
        )}
        <div className="flex items-center">
          <div>
            <p className="text-sm font-semibold text-slate-900">{currentUser.name}</p>
            <p className="text-xs text-slate-500">{currentUser.role}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="ml-auto p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
