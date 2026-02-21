import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import { CubeIcon } from '../icons/CubeIcon';
import { TagIcon } from '../icons/TagIcon';
import ChartBarIcon from '../icons/ChartBarIcon';
import MapIcon from '../icons/MapIcon';
import ShoppingCartIcon from '../icons/ShoppingCartIcon';
import DocumentTextIcon from '../icons/DocumentTextIcon';
import CurrencyDollarIcon from '../icons/CurrencyDollarIcon';
import ClipboardListIcon from '../icons/ClipboardListIcon';
import AnimalProductionDetail from './animal/AnimalProductionDetail';
import PropertyMapView from '../views/maps/PropertyMapView';
import AuditTimeline from '../shared/AuditTimeline';
import SkeletonLoader from '../shared/SkeletonLoader';
import {
  OperationalActionType,
  ProductionSector,
  ProductionProject,
  FinancialDetails,
  AnimalProductionDetails,
  SectorSpecificData,
  ProjectStage,
  AuditEvent,
  OperatorRequest,
  Property,
} from '../../types';
import { propertyService } from '../../services/propertyService';
import { producerDashboardService } from '../../services/producerDashboardService';
import { operatorService } from '../../services/operatorService';
import { useToast } from '../../contexts/ToastContext';

const ProjectIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || 'h-6 w-6'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

interface ProducerDashboardProps {
  selectedProductionId: string | null;
  setSelectedProductionId: (id: string | null) => void;
  setCurrentAction: (action: OperationalActionType) => void;
}

interface ShortcutItem {
  id: string;
  label: string;
  path: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}

const SHORTCUTS: ShortcutItem[] = [
  { id: 'sales', label: 'Vendas', path: '/sales', description: 'Mercado consumidor e leilao', icon: TagIcon },
  { id: 'contracts', label: 'Contratos', path: '/contracts', description: 'Gestao e arquivo original', icon: DocumentTextIcon },
  { id: 'stock', label: 'Estoque', path: '/stock', description: 'Consumiveis, bens e localizacao', icon: CubeIcon },
  { id: 'field-operations', label: 'Talhoes e Pastos', path: '/field-operations', description: 'Historico e custo por area', icon: MapIcon },
  { id: 'financials', label: 'Financeiro', path: '/financials', description: 'Fluxo e indicadores', icon: CurrencyDollarIcon },
  { id: 'reports', label: 'Relatorios', path: '/reports', description: 'Analise por operacao', icon: ChartBarIcon },
  { id: 'management', label: 'Manejo', path: '/management', description: 'Planejamento operacional', icon: ClipboardListIcon },
  { id: 'property-registration', label: 'Propriedade', path: '/property-registration', description: 'Cadastro e mapa', icon: BriefcaseIcon },
];

const getSectorConfig = (sector: ProductionSector) => {
  if (sector === 'Agricultura') {
    return {
      icon: 'AG',
      quickActions: [
        { id: 'registerPlanting', label: 'Registrar plantio' },
        { id: 'sellCrop', label: 'Vender safra' },
      ],
      summaryTitle: 'Resumo da lavoura',
    };
  }

  if (sector.toLowerCase().includes('bovinos')) {
    return {
      icon: 'PC',
      quickActions: [
        { id: 'registerAnimal', label: 'Registrar animal' },
        { id: 'sellBatch', label: 'Vender lote' },
      ],
      summaryTitle: 'Resumo do rebanho',
    };
  }

  return { icon: 'PR', quickActions: [], summaryTitle: 'Resumo da producao' };
};

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    <SkeletonLoader className="h-24 w-full rounded-lg" />
    <SkeletonLoader className="h-40 w-full rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <SkeletonLoader className="h-48 w-full rounded-lg xl:col-span-4" />
      <SkeletonLoader className="h-48 w-full rounded-lg xl:col-span-2" />
      <SkeletonLoader className="h-48 w-full rounded-lg xl:col-span-2" />
    </div>
  </div>
);

const ProducerDashboard: React.FC<ProducerDashboardProps> = ({
  selectedProductionId,
  setSelectedProductionId,
  setCurrentAction,
}) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'Cards' | 'Map'>('Cards');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [requests, setRequests] = useState<OperatorRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activities, setActivities] = useState<ProductionProject[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [financialDetailsMap, setFinancialDetailsMap] = useState<Record<string, FinancialDetails>>({});
  const [animalDetailsMap, setAnimalDetailsMap] = useState<Record<string, AnimalProductionDetails>>({});
  const [sectorDetailsMap, setSectorDetailsMap] = useState<Record<string, SectorSpecificData>>({});
  const [stageDetailsMap, setStageDetailsMap] = useState<Record<string, SectorSpecificData>>({});
  const [projectStagesMap, setProjectStagesMap] = useState<Record<string, ProjectStage[]>>({});
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [workspace, financials, animalDetails, sectorDetails, stageDetails, projectStages, auditData, operatorRequests] =
          await Promise.all([
            propertyService.loadWorkspace(),
            producerDashboardService.listFinancialDetails(),
            producerDashboardService.listAnimalDetails(),
            producerDashboardService.listSectorDetails(),
            producerDashboardService.listStageDetails(),
            producerDashboardService.listProjectStages(),
            producerDashboardService.listAuditEvents(),
            operatorService.listRequests(),
          ]);

        setActivities(workspace.activities);
        setProperty(workspace.property);
        setFinancialDetailsMap(financials);
        setAnimalDetailsMap(animalDetails);
        setSectorDetailsMap(sectorDetails);
        setStageDetailsMap(stageDetails);
        setProjectStagesMap(projectStages);
        setAuditEvents(auditData);
        setRequests(operatorRequests);
      } catch {
        setLoadError('Nao foi possivel carregar o painel do produtor.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  useEffect(() => {
    setSelectedStageId('');
  }, [selectedProductionId]);

  const isConsolidatedView = selectedProductionId === 'ALL';
  const selectedProduction = !isConsolidatedView ? activities.find((p) => p.id === selectedProductionId) : null;
  const aggregatedFinancials = isConsolidatedView
    ? {
        projectId: 'ALL',
        totalCost: Object.values(financialDetailsMap).reduce((a, c) => a + c.totalCost, 0),
        realizedRevenue: Object.values(financialDetailsMap).reduce((a, c) => a + c.realizedRevenue, 0),
        futureRevenue: Object.values(financialDetailsMap).reduce((a, c) => a + c.futureRevenue, 0),
        batches: [],
      }
    : null;
  const financialDetails = !isConsolidatedView && selectedProductionId ? financialDetailsMap[selectedProductionId] : aggregatedFinancials;
  const animalDetails = !isConsolidatedView && selectedProductionId ? animalDetailsMap[selectedProductionId] : null;
  const sectorDetails =
    !isConsolidatedView && selectedProductionId
      ? (selectedStageId && stageDetailsMap[selectedStageId] ? stageDetailsMap[selectedStageId] : sectorDetailsMap[selectedProductionId])
      : null;
  const pastures = !isConsolidatedView && selectedProductionId ? animalDetailsMap[selectedProductionId]?.pastures || [] : [];
  const activeStages = !isConsolidatedView && selectedProductionId ? (projectStagesMap[selectedProductionId] || []).filter((s) => s.status === 'ACTIVE') : [];
  const sectorConfig = selectedProduction ? getSectorConfig(selectedProduction.type) : null;

  const pendingRequests = requests.filter((request) => request.status === 'PENDING');
  const latestAuditEvent = useMemo(() => {
    if (auditEvents.length === 0) return null;
    const sorted = [...auditEvents].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return sorted[0];
  }, [auditEvents]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleRequestDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    const previousStatus = requests.find((item) => item.id === id)?.status;
    setRequests((prev) => prev.map((request) => (request.id === id ? { ...request, status: decision } : request)));
    try {
      await operatorService.updateRequestStatus(id, decision);
      addToast({ type: 'success', title: 'Solicitacao atualizada', message: 'Status persistido no Firebase.' });
    } catch {
      if (previousStatus) {
        setRequests((prev) => prev.map((request) => (request.id === id ? { ...request, status: previousStatus } : request)));
      }
      addToast({ type: 'error', title: 'Falha ao atualizar', message: 'Nao foi possivel persistir a solicitacao.' });
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Painel do Produtor</h2>
          <p className="text-slate-600">Gestao integrada da operacao com navegacao principal na propria tela.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/property-registration')}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 shadow-sm"
          >
            <DocumentTextIcon className="h-5 w-5 mr-2" />
            Cadastro de propriedade
          </button>
          {(selectedProduction || isConsolidatedView) && (
            <div className="flex bg-slate-200 rounded p-1">
              <button
                onClick={() => setViewMode('Cards')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold ${
                  viewMode === 'Cards' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'
                }`}
              >
                <ProjectIcon />
                <span className="ml-2 hidden sm:inline">Visao geral</span>
              </button>
              {!isConsolidatedView && (
                <button
                  onClick={() => setViewMode('Map')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold ${
                    viewMode === 'Map' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  <MapIcon className="h-5 w-5" />
                  <span className="ml-2 hidden sm:inline">Mapa</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-8 bg-white p-5 rounded-lg shadow-md border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Navegacao rapida do produtor</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut.id}
              onClick={() => navigate(shortcut.path)}
              className="text-left p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <shortcut.icon className="h-5 w-5 text-indigo-600" />
                <p className="font-semibold text-slate-800">{shortcut.label}</p>
              </div>
              <p className="text-xs text-slate-500">{shortcut.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="production-select" className="block text-sm font-medium text-slate-700 mb-2">
              Visualizacao da operacao
            </label>
            <select
              id="production-select"
              value={selectedProductionId || ''}
              onChange={(e) => setSelectedProductionId(e.target.value || null)}
              className="block w-full p-3 border border-slate-300 rounded-md shadow-sm disabled:bg-slate-100"
              disabled={isLoading}
            >
              <option value="">-- Selecione --</option>
              <option value="ALL" className="font-bold text-indigo-700">
                Visao consolidada (holding)
              </option>
              <optgroup label="Projetos individuais">
                {activities.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.type})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          {!isConsolidatedView && selectedProductionId && activeStages.length > 0 && (
            <div className="animate-fade-in">
              <label htmlFor="stage-select" className="block text-sm font-medium text-slate-700 mb-2">
                Especie / estagio ativo
              </label>
              <select
                id="stage-select"
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="block w-full p-3 border border-emerald-300 bg-emerald-50 rounded-md disabled:bg-slate-100"
                disabled={isLoading}
              >
                <option value="">-- Visao geral do projeto --</option>
                {activeStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {!selectedProduction && !isConsolidatedView ? (
        <div className="text-center py-16 bg-white rounded-lg shadow-md">
          <BriefcaseIcon className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-lg font-medium">Selecione uma visualizacao</h3>
          <p className="mt-1 text-sm text-slate-500">Escolha a visao consolidada ou uma fazenda especifica.</p>
        </div>
      ) : (
        <>
          {viewMode === 'Cards' && (
            <>
              <div className="bg-gradient-to-r from-sky-600 to-indigo-700 rounded-lg shadow-lg p-6 mb-6 text-white animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start">
                  <div className="mb-3 md:mb-0">
                    <h3 className="text-lg font-bold">Pulso operacional</h3>
                    <p className="text-sky-100 text-sm">
                      {latestAuditEvent
                        ? `Ultimo evento: ${latestAuditEvent.action} (${latestAuditEvent.actor})`
                        : 'Sem eventos recentes registrados no painel de auditoria.'}
                    </p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-lg text-sm">
                    <p className="font-semibold">
                      {latestAuditEvent
                        ? new Date(latestAuditEvent.timestamp).toLocaleString('pt-BR')
                        : 'Aguardando atividade'}
                    </p>
                    {latestAuditEvent?.details && <p className="text-sky-100 mt-1">{latestAuditEvent.details}</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 animate-fade-in">
                <div className="bg-white p-6 rounded-lg shadow-md xl:col-span-4 border-t-4 border-indigo-500">
                  <div className="flex items-center text-indigo-700 mb-4">
                    <ProjectIcon />
                    <h3 className="text-xl font-bold ml-3">
                      {isConsolidatedView ? 'Resumo da holding' : `Projeto: ${selectedProduction?.name}`}
                    </h3>
                    {!isConsolidatedView && (
                      <span className="ml-auto bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {selectedProduction?.type} {sectorConfig?.icon}
                      </span>
                    )}
                  </div>
                  {isConsolidatedView ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs uppercase font-bold">Total projetos</p>
                        <p className="text-lg font-bold">{activities.length}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs uppercase font-bold">Receita realizada</p>
                        <p className="text-lg font-bold">{formatCurrency(financialDetails?.realizedRevenue ?? 0)}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs uppercase font-bold">Receita futura</p>
                        <p className="text-lg font-bold">{formatCurrency(financialDetails?.futureRevenue ?? 0)}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs uppercase font-bold">Custo total</p>
                        <p className="text-lg font-bold">{formatCurrency(financialDetails?.totalCost ?? 0)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs uppercase font-bold">Status</p>
                        <p className="text-lg font-bold">{selectedProduction?.status}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs uppercase font-bold">Preco alvo</p>
                        <p className="text-lg font-bold text-emerald-600">{selectedProduction?.precoAlvo}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs uppercase font-bold">Receita realizada</p>
                        <p className="text-lg font-bold">{formatCurrency(financialDetails?.realizedRevenue ?? 0)}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-xs uppercase font-bold">Custo total</p>
                        <p className="text-lg font-bold">{formatCurrency(financialDetails?.totalCost ?? 0)}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md xl:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-indigo-700 flex items-center">
                      <ShoppingCartIcon className="h-6 w-6 mr-2" />
                      Solicitacoes
                    </h3>
                    {pendingRequests.length > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {pendingRequests.length} pendentes
                      </span>
                    )}
                  </div>
                  {pendingRequests.length === 0 ? (
                    <p>Nenhuma solicitacao pendente.</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests.map((request) => (
                        <div key={request.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                          <p className="font-bold text-sm">{request.item}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRequestDecision(request.id, 'APPROVED')}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-bold"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleRequestDecision(request.id, 'REJECTED')}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-bold"
                            >
                              Negar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="xl:col-span-2">
                  <AuditTimeline events={auditEvents} compact={true} />
                </div>

                {sectorDetails && !isConsolidatedView && (
                  <div className="bg-white p-6 rounded-lg shadow-md xl:col-span-2">
                    <h3 className="text-xl font-bold mb-4">{sectorConfig?.summaryTitle}</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">{sectorDetails.kpi1Label}</span>
                        <span className="font-bold">{sectorDetails.kpi1Value}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">{sectorDetails.kpi2Label}</span>
                        <span className="font-bold">{sectorDetails.kpi2Value}</span>
                      </div>
                    </div>
                  </div>
                )}

                {!isConsolidatedView && sectorConfig?.quickActions.length ? (
                  <div className="bg-white p-6 rounded-lg shadow-md xl:col-span-2">
                    <h3 className="text-xl font-bold mb-4">Acoes rapidas</h3>
                    <div className="space-y-2">
                      {sectorConfig.quickActions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => setCurrentAction(action.id as OperationalActionType)}
                          className="w-full text-left p-3 bg-slate-50 hover:bg-sky-100 rounded-lg"
                        >
                          <p className="font-semibold text-sky-800">{action.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {viewMode === 'Map' && !isConsolidatedView && property && (
            <div className="animate-fade-in mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold flex items-center">
                    <MapIcon className="h-6 w-6 mr-2 text-emerald-600" />
                    Visao aerea
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full">
                    Modo satelite
                  </span>
                </div>
                <PropertyMapView property={property} pastures={pastures} />
              </div>
            </div>
          )}

          {!isConsolidatedView &&
            selectedProduction &&
            selectedProduction.type.toLowerCase().includes('pecu') &&
            animalDetails &&
            viewMode === 'Cards' && (
              <div className="mt-6 animate-fade-in">
                <AnimalProductionDetail details={animalDetails} />
              </div>
            )}
        </>
      )}
    </div>
  );
};

export default ProducerDashboard;
