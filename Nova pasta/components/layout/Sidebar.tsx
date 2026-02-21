import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ProductionProject, ViewType } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { canAccessView } from '../../config/accessControl';
import { getSectorSettings } from '../../config/sectorUtils';
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
  propertyRegistration: MapIcon,
  reports: ChartBarIcon,
  fieldOperations: ClipboardListIcon,
  liveHandling: QrCodeIcon,
  management: BeakerIcon,
  workforce: UsersIcon,
  contracts: DocumentReportIcon,
  futureMarket: TrendingUpIcon,
  carbonMarket: LeafIcon,
  customInputRequest: FlaskIcon,
  aiAnalysis: SparklesIcon,
  integrations: PuzzleIcon,
  architecture: DiagramIcon,
  dataDictionary: BookIcon,
  operations: TableIcon,
  flows: FlowIcon,
  systemConfig: DiagramIcon,
  producerPortal: BriefcaseIcon,
  technicianPortal: BriefcaseIcon,
  investorPortal: BriefcaseIcon,
  supplierPortal: BriefcaseIcon,
  integratorPortal: BriefcaseIcon,
  finance: CashIcon,
  legal: BriefcaseIcon,
};

const viewToPath = (view: ViewType) => `/${view.replace(/([A-Z])/g, '-$1').toLowerCase()}`;

const Sidebar: React.FC = () => {
  const { currentUser, logout, selectedProductionId } = useApp();
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

  const selectedProduction = projects.find((p) => p.id === selectedProductionId);
  const sectorSettings = getSectorSettings(selectedProduction?.type);

  const isViewAllowed = (viewId: string) => canAccessView(currentUser, viewId as ViewType);

  const baseProducerSubNav = sectorSettings.navigation.filter((item) => isViewAllowed(item.view)).map((item) => ({
    id: item.view,
    label: item.label,
    icon: VIEW_ICONS[item.view] || BriefcaseIcon,
    path: viewToPath(item.view),
  }));

  const producerSubNav = [...baseProducerSubNav];

  const isProducerSubNavActive = producerSubNav.some((item) => location.pathname.startsWith(item.path));
  const [isProducerNavOpen, setProducerNavOpen] = useState(isProducerSubNavActive);

  useEffect(() => {
    setProducerNavOpen(isProducerSubNavActive);
  }, [isProducerSubNavActive]);

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

  const navSections = [
    { title: 'Geral', items: [{ id: 'dashboard', label: 'Painel', path: '/dashboard' }] },
    {
      title: 'Sistema',
      items: [
        { id: 'integrations', label: 'Integracoes', path: '/integrations' },
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
            <ul className="pl-6 border-l-2 border-slate-200 ml-3 animate-slide-down">
              {producerSubNav.map((subItem) => (
                <li key={subItem.id}>
                  <NavLink to={subItem.path} className={subNavLinkClass} end>
                    <subItem.icon className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span>{subItem.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
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
    <aside className="w-full md:w-64 bg-white/86 backdrop-blur-2xl text-slate-700 flex flex-col h-full border-r border-slate-200/80 shadow-[0_0_0_1px_rgba(15,23,42,0.04)]">
      <div className="p-6 border-b border-slate-200/80">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Ciclo<span className="text-teal-600">+</span>
        </h1>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mt-1">ERP Agro</p>
      </div>
      <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar">{renderNavForRole()}</nav>
      <div className="p-4 border-t border-slate-200/80 bg-white/75">
        {selectedProduction && currentUser.role === 'Produtor' && (
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
