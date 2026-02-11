
import React from 'react';
import { ViewType, User } from '../types';
import HomeIcon from './icons/HomeIcon';
import DiagramIcon from './icons/DiagramIcon';
import BookIcon from './icons/BookIcon';
import TableIcon from './icons/TableIcon';
import FlowIcon from './icons/FlowIcon';
import { CubeIcon } from './icons/CubeIcon';
import { CashIcon } from './icons/CashIcon';
import { TagIcon } from './icons/TagIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';
import { LogoutIcon } from './icons/LogoutIcon';
import { roleAccessConfig } from '../config/accessControl';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  currentUser: User;
  onLogout: () => void;
}

const navSections = [
    {
        title: "Geral",
        items: [
            { id: 'dashboard', label: 'Painel', icon: HomeIcon },
        ]
    },
    {
        title: "Portais",
        items: [
            { id: 'producerPortal', label: 'Produtor', icon: BriefcaseIcon },
            { id: 'technicianPortal', label: 'Técnico', icon: BriefcaseIcon },
            { id: 'investorPortal', label: 'Investidor', icon: BriefcaseIcon },
            { id: 'supplierPortal', label: 'Fornecedor', icon: BriefcaseIcon },
        ]
    },
    {
        title: "Módulos",
        items: [
            { id: 'finance', label: 'Financeiro', icon: CashIcon },
            { id: 'stock', label: 'Estoque', icon: CubeIcon },
            { id: 'commercial', label: 'Comercial', icon: TagIcon },
            { id: 'logistics', label: 'Logística', icon: BriefcaseIcon },
            { id: 'legal', label: 'Jurídico', icon: BriefcaseIcon },
        ]
    },
    {
        title: "Sistema",
        items: [
            { id: 'architecture', label: 'Arquitetura', icon: DiagramIcon },
            { id: 'dataDictionary', label: 'Dicionário de Dados', icon: BookIcon },
            { id: 'operations', label: 'Tabela de Operações', icon: TableIcon },
            { id: 'flows', label: 'Fluxos de Liquidação', icon: FlowIcon },
        ]
    }
]

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, currentUser, onLogout }) => {
  
  const userAccessList = roleAccessConfig[currentUser.role];

  const accessibleNavSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => userAccessList.includes(item.id as ViewType))
    }))
    .filter(section => section.items.length > 0);

  return (
    <aside className="w-64 bg-slate-800 text-slate-200 flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white">Ciclo<span className="text-emerald-400">+</span></h1>
        <p className="text-sm text-slate-400">ERP Agro</p>
      </div>
      <nav className="flex-1 px-4 overflow-y-auto">
        {accessibleNavSections.map(section => (
            <div key={section.title} className="mb-4">
                <h2 className="px-3 py-2 text-xs font-bold uppercase text-slate-500">{section.title}</h2>
                <ul>
                {section.items.map((item) => (
                    <li key={item.id}>
                    <button
                        onClick={() => setActiveView(item.id as ViewType)}
                        className={`w-full text-left flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
                        activeView === item.id
                            ? 'bg-emerald-500 text-white'
                            : 'hover:bg-slate-700 text-slate-300'
                        }`}
                    >
                        <item.icon className="h-6 w-6 mr-3 flex-shrink-0" />
                        <span className="text-sm">{item.label}</span>
                    </button>
                    </li>
                ))}
                </ul>
            </div>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center">
            <div>
                <p className="text-sm font-semibold text-white">{currentUser.name}</p>
                <p className="text-xs text-slate-400">{currentUser.role}</p>
            </div>
            <button onClick={onLogout} title="Sair" className="ml-auto p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <LogoutIcon className="h-5 w-5" />
            </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
