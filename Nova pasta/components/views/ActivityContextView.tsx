import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useApp } from '../../contexts/AppContext';
import { ProductionProject, User } from '../../types';
import { propertyService } from '../../services/propertyService';

const normalizeRole = (role: User['role'] | undefined): string =>
  String(role ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const resolveDefaultRoute = (role: User['role'] | undefined): string => {
  const normalized = normalizeRole(role);
  if (normalized.includes('leiloeiro')) return '/auction-portal';
  if (normalized.includes('operador')) return '/operator-portal';
  if (normalized.includes('trafego')) return '/logistics-portal';
  if (normalized.includes('fornecedor')) return '/supplier-portal';
  if (normalized.includes('integradora')) return '/integrator-portal';
  if (normalized.includes('tecnico')) return '/technician-portal';
  return '/dashboard';
};

const sanitizeTargetPath = (value: string | null, fallback: string): string => {
  if (!value || !value.startsWith('/')) {
    return fallback;
  }

  if (value === '/activity-context' || value.startsWith('/activity-context?')) {
    return fallback;
  }

  if (value.startsWith('/login')) {
    return fallback;
  }

  return value;
};

const normalizeStatus = (status: string | undefined): string =>
  String(status ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const resolveDefaultActivity = (activities: ProductionProject[]): ProductionProject | null => {
  if (activities.length === 0) {
    return null;
  }

  const inProgress = activities.find((activity) => normalizeStatus(activity.status).includes('ANDAMENTO'));
  if (inProgress) {
    return inProgress;
  }

  const notClosed = activities.find((activity) => !normalizeStatus(activity.status).includes('CONCLUIDO'));
  if (notClosed) {
    return notClosed;
  }

  return activities[0];
};

const ActivityContextView: React.FC = () => {
  const { currentUser, selectedProductionId, setSelectedProductionId } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [activities, setActivities] = useState<ProductionProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const targetPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return sanitizeTargetPath(params.get('next'), resolveDefaultRoute(currentUser?.role));
  }, [location.search, currentUser?.role]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const rows = await propertyService.listProductionProjects();
        if (!mounted) return;
        setActivities(rows);
      } catch {
        if (!mounted) return;
        setLoadError('Nao foi possivel carregar as atividades da propriedade.');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedActivity = useMemo(
    () => activities.find((item) => item.id === selectedProductionId) ?? null,
    [activities, selectedProductionId]
  );
  const defaultActivity = useMemo(() => resolveDefaultActivity(activities), [activities]);
  const activeActivity = selectedActivity ?? defaultActivity;

  const handleSelect = (activityId: string) => {
    setSelectedProductionId(activityId);
    navigate(targetPath, { replace: true });
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando atividades..." />;
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-5 sm:p-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">Selecionar atividade de acesso</h2>
        <p className="mt-2 text-sm text-slate-600">
          Antes de entrar no portal, escolha a cultura/atividade que sera visualizada e editada nesta sessao.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              if (activeActivity) {
                handleSelect(activeActivity.id);
              }
            }}
            disabled={!activeActivity}
            className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-left transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <p className="text-xs uppercase tracking-wider text-indigo-600">Entrada rapida</p>
            <p className="mt-1 text-sm font-semibold text-indigo-900">
              {activeActivity ? 'Acessar atividade ativa' : 'Nenhuma atividade ativa'}
            </p>
            {activeActivity && (
              <p className="mt-1 text-xs text-indigo-700">
                {activeActivity.name} ({activeActivity.type})
              </p>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/property-registration')}
            className="rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="text-xs uppercase tracking-wider text-slate-500">Cadastro</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Cadastrar propriedade/atividade</p>
            <p className="mt-1 text-xs text-slate-600">Abrir modulo de propriedade para criar ou editar.</p>
          </button>
        </div>

        {activeActivity && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Atividade atual: <strong>{activeActivity.name}</strong> ({activeActivity.type})
          </div>
        )}

        {loadError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>
        )}

        {activities.length === 0 ? (
          <div className="mt-6 space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              Nenhuma atividade encontrada. Cadastre uma atividade para liberar o acesso ao dashboard.
            </p>
            <button
              type="button"
              onClick={() => navigate('/property-registration')}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Ir para cadastro de propriedade/atividade
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
            {activities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => handleSelect(activity.id)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedProductionId === activity.id
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{activity.name}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {activity.type} | {activity.status}
                </p>
                <p className="mt-1 text-xs text-slate-500">Volume: {activity.volume || '-'}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityContextView;
