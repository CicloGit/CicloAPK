import React, { useEffect, useMemo, useState } from 'react';
import { CashIcon } from '../icons/CashIcon';
import ShieldCheckIcon from '../icons/ShieldCheckIcon';
import UsersIcon from '../icons/UsersIcon';
import ClipboardListIcon from '../icons/ClipboardListIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import { managerService, ManagerActivity, ManagerKpi } from '../../services/managerService';

const KpiCard: React.FC<{ title: string; value: string; icon: React.FC<{className?: string}>; color: string }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <div className={`flex items-center ${color}`}>
            <Icon className="h-6 w-6" />
            <h3 className="text-xl font-bold ml-3">{title}</h3>
        </div>
        <p className="text-3xl font-bold text-slate-800 mt-4">{value}</p>
    </div>
);

const iconMap: Record<ManagerKpi['icon'], React.FC<{className?: string}>> = {
    projects: ClipboardListIcon,
    escrow: CashIcon,
    users: UsersIcon,
};

const ManagerDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<ManagerKpi[]>([]);
  const [activities, setActivities] = useState<ManagerActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
      const loadManager = async () => {
          setIsLoading(true);
          setLoadError(null);
          try {
              const [loadedKpis, loadedActivities] = await Promise.all([
                  managerService.listKpis(),
                  managerService.listActivities(),
              ]);
              setKpis(loadedKpis);
              setActivities(loadedActivities);
          } catch {
              setLoadError('Nao foi possivel carregar o painel de gestao.');
          } finally {
              setIsLoading(false);
          }
      };

      void loadManager();
  }, []);

  if (isLoading) {
      return <LoadingSpinner text="Carregando gestao..." />;
  }

  if (loadError) {
      return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Painel de Gestao</h2>
      <p className="text-slate-600 mb-8">Visao geral do sistema e principais indicadores de operacao.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* KPI Cards */}
        {kpis.map((kpi) => {
            const Icon = iconMap[kpi.icon];
            return <KpiCard key={kpi.id} title={kpi.label} value={kpi.value} icon={Icon} color={kpi.color} />;
        })}
        
        {/* Quick Actions Card */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2 xl:col-span-1">
            <div className="flex items-center text-slate-700 mb-4">
                <ShieldCheckIcon className="h-6 w-6" />
                <h3 className="text-xl font-bold ml-3">Acoes Administrativas</h3>
            </div>
             <div className="space-y-2">
                <button className="w-full text-left p-3 bg-slate-50 hover:bg-emerald-100 rounded-md transition-colors text-sm font-semibold text-slate-700">Aprovar Contratos (3)</button>
                <button className="w-full text-left p-3 bg-slate-50 hover:bg-emerald-100 rounded-md transition-colors text-sm font-semibold text-slate-700">Gerenciar Limites de Credito</button>
                <button className="w-full text-left p-3 bg-slate-50 hover:bg-emerald-100 rounded-md transition-colors text-sm font-semibold text-slate-700">Visualizar Auditoria</button>
            </div>
        </div>

        {/* Recent Critical Activity Card */}
        <div className="bg-white p-6 rounded-lg shadow-md xl:col-span-2">
             <h3 className="text-xl font-bold text-slate-800 mb-4">Atividades Criticas Recentes</h3>
             <ul className="space-y-4">
                {activities.map((activity) => (
                    <li key={activity.id} className="flex items-start">
                        <span className={`text-sm font-semibold w-32 ${activity.severity === 'ALERTA' ? 'text-red-600' : activity.severity === 'LOCK' ? 'text-orange-600' : 'text-blue-600'}`}>{activity.label}</span>
                        <p className="text-sm text-slate-600">{activity.description}</p>
                    </li>
                ))}
             </ul>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
