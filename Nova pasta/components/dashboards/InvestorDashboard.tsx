import React, { useEffect, useMemo, useState } from 'react';
import { CashIcon } from '../icons/CashIcon';
import LibraryIcon from '../icons/LibraryIcon';
import TrendingUpIcon from '../icons/TrendingUpIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import { investorService, InvestorKpi, InvestorProject } from '../../services/investorService';

const KpiCard: React.FC<{ title: string; value: string; icon: React.FC<{className?: string}>; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <div className={`flex items-center text-sm font-bold ${color}`}>
            <Icon className="h-5 w-5 mr-2" />
            {title}
        </div>
        <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
    </div>
);

const iconMap: Record<InvestorKpi['icon'], React.FC<{className?: string}>> = {
    library: LibraryIcon,
    cash: CashIcon,
    trend: TrendingUpIcon,
    briefcase: BriefcaseIcon,
};

const InvestorDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<InvestorKpi[]>([]);
  const [projects, setProjects] = useState<InvestorProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
      const loadInvestor = async () => {
          setIsLoading(true);
          setLoadError(null);
          try {
              const [loadedKpis, loadedProjects] = await Promise.all([
                  investorService.listKpis(),
                  investorService.listProjects(),
              ]);
              setKpis(loadedKpis);
              setProjects(loadedProjects);
          } catch {
              setLoadError('Nao foi possivel carregar o painel do investidor.');
          } finally {
              setIsLoading(false);
          }
      };

      void loadInvestor();
  }, []);

  if (isLoading) {
      return <LoadingSpinner text="Carregando investidor..." />;
  }

  if (loadError) {
      return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Painel do Investidor</h2>
      <p className="text-slate-600 mb-8">Acompanhe seus investimentos e descubra novas oportunidades.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* KPI Cards */}
        {kpis.map((kpi) => {
            const Icon = iconMap[kpi.icon];
            return <KpiCard key={kpi.id} title={kpi.label} value={kpi.value} icon={Icon} color={kpi.color} />;
        })}

        {/* Portfolio Summary */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2 xl:col-span-3">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Meus Projetos</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase"><tr><th className="py-2">Projeto</th><th>Valor Aportado</th><th>Status</th><th>Rentabilidade Prev.</th></tr></thead>
                    <tbody>
                        {projects.map((project) => (
                            <tr key={project.id} className="border-b">
                                <td className="py-3 font-semibold">{project.name}</td>
                                <td>{project.invested}</td>
                                <td>
                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${project.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                        {project.status === 'Ativo' ? 'Ativo' : 'Concluido'}
                                    </span>
                                </td>
                                <td>{project.expectedReturn}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Acoes</h3>
            <div className="space-y-3">
                <button className="w-full p-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors">Analisar Oportunidades</button>
                <button className="w-full p-3 bg-slate-200 text-slate-800 rounded-lg font-semibold hover:bg-slate-300 transition-colors">Solicitar Retirada</button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InvestorDashboard;
