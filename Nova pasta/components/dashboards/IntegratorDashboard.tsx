import React, { useEffect, useMemo, useState } from 'react';
import UsersIcon from '../icons/UsersIcon';
import { CashIcon } from '../icons/CashIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import PlusCircleIcon from '../icons/PlusCircleIcon';
import ShieldCheckIcon from '../icons/ShieldCheckIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import MapIcon from '../icons/MapIcon';
import { CubeIcon } from '../icons/CubeIcon';
import LockClosedIcon from '../icons/LockClosedIcon';
import TrendingUpIcon from '../icons/TrendingUpIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useApp } from '../../contexts/AppContext';
import {
  integratorService,
  IntegratorApiAuthMode,
  IntegratorApiLink,
} from '../../services/integratorService';
import { IntegratedProducer, PartnershipOffer } from '../../types';

type IntegratorTab =
  | 'PRODUCERS'
  | 'DEMANDS'
  | 'OFFERS'
  | 'CONTRACT_SCHEDULE'
  | 'FINANCE'
  | 'RECEIVABLES'
  | 'PAYMENTS';

type FinanceEntryType = 'Investimento' | 'Antecipacao';
type ReceivableRowStatus = 'Pendente' | 'Em Escrow' | 'Liquidado';
type PaymentRowStatus = 'Agendado' | 'Processando' | 'Pago';

interface ContractScheduleRow {
  id: string;
  producerName: string;
  development: string;
  contractType: string;
  nextReportDate: string;
  estimatedVolume: string;
  status: 'Em Execucao' | 'Aguardando Assinatura' | 'Finalizado';
}

interface FinanceEntry {
  id: string;
  operation: string;
  type: FinanceEntryType;
  amount: number;
  status: 'Ativo' | 'Liquidado' | 'Analise';
}

interface ReceivableRow {
  id: string;
  contractRef: string;
  producer: string;
  amount: number;
  dueDate: string;
  status: ReceivableRowStatus;
}

interface PaymentRow {
  id: string;
  destination: string;
  amount: number;
  dueDate: string;
  method: 'Asaas Split' | 'Escrow Release' | 'PIX';
  status: PaymentRowStatus;
}

const KpiCard: React.FC<{ title: string; value: string; icon: React.FC<{ className?: string }>; color: string }> = ({
  title,
  value,
  icon: Icon,
  color,
}) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <div className={`flex items-center text-sm font-bold ${color}`}>
      <Icon className="h-5 w-5 mr-2" />
      {title}
    </div>
    <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
  </div>
);

const getStatusTone = (value: string): 'available' | 'negotiating' | 'contracted' => {
  const lower = value.toLowerCase();
  if (lower.includes('contrat')) return 'contracted';
  if (lower.includes('negoc')) return 'negotiating';
  return 'available';
};

const dateOffset = (days: number): string => {
  const base = new Date();
  base.setDate(base.getDate() + days);
  return base.toLocaleDateString('pt-BR');
};

const IntegratorDashboard: React.FC = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<IntegratorTab>('PRODUCERS');
  const [offers, setOffers] = useState<PartnershipOffer[]>([]);
  const [producers, setProducers] = useState<IntegratedProducer[]>([]);
  const [selectedProducerId, setSelectedProducerId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [targetStage, setTargetStage] = useState('Todos');
  const [producerFilter, setProducerFilter] = useState('');
  const [demandTitle, setDemandTitle] = useState('');
  const [demandDescription, setDemandDescription] = useState('');
  const [demandType, setDemandType] = useState<PartnershipOffer['type']>('Compra Garantida');
  const [apiLink, setApiLink] = useState<IntegratorApiLink | null>(null);
  const [apiCompanyName, setApiCompanyName] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiClientId, setApiClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiAuthMode, setApiAuthMode] = useState<IntegratorApiAuthMode>('API');
  const [apiFeedback, setApiFeedback] = useState<string | null>(null);
  const [isSavingApi, setIsSavingApi] = useState(false);
  const [isUpdatingOffer, setIsUpdatingOffer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  useEffect(() => {
    const loadIntegrator = async () => {
      setIsLoading(true);
      setLoadError(null);
      setActionError(null);
      try {
        const [loadedProducers, loadedOffers, loadedApiLink] = await Promise.all([
          integratorService.listProducers(),
          integratorService.listOffers(),
          currentUser?.uid ? integratorService.getApiLink(currentUser.uid) : Promise.resolve(null),
        ]);
        setProducers(loadedProducers);
        setOffers(loadedOffers);
        setApiLink(loadedApiLink);

        if (loadedApiLink) {
          setApiCompanyName(loadedApiLink.companyName);
          setApiBaseUrl(loadedApiLink.baseUrl);
          setApiClientId(loadedApiLink.clientId);
          setApiAuthMode(loadedApiLink.authMode);
        } else if (currentUser?.name) {
          setApiCompanyName(currentUser.name);
        }
      } catch {
        setLoadError('Nao foi possivel carregar o portal de integracao.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadIntegrator();
  }, [currentUser?.name, currentUser?.uid]);

  const handleCreateDemand = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!demandTitle.trim() || !demandDescription.trim()) {
      setActionError('Informe titulo e descricao da demanda.');
      return;
    }

    try {
      const created = await integratorService.createDemand({
        title: demandTitle.trim(),
        description: demandDescription.trim(),
        type: demandType,
      });
      setOffers((prev) => [created, ...prev]);
      setDemandTitle('');
      setDemandDescription('');
      setDemandType('Compra Garantida');
      setActionError(null);
    } catch {
      setActionError('Nao foi possivel criar a demanda de compra.');
    }
  };

  const handleSaveApiLink = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentUser?.uid) {
      setActionError('Sessao da Integradora nao encontrada para vincular API.');
      return;
    }

    if (!apiCompanyName.trim() || !apiBaseUrl.trim() || !apiClientId.trim()) {
      setApiFeedback('Informe razao social, URL base e client id para continuar.');
      return;
    }

    if (apiAuthMode === 'API' && !apiKey.trim() && !apiLink?.apiKeyHint) {
      setApiFeedback('Informe a chave de API para concluir a vinculacao.');
      return;
    }

    try {
      setIsSavingApi(true);
      const saved = await integratorService.saveApiLink({
        ownerId: currentUser.uid,
        companyName: apiCompanyName,
        baseUrl: apiBaseUrl,
        clientId: apiClientId,
        authMode: apiAuthMode,
        apiKey: apiKey.trim() || undefined,
      });
      setApiLink(saved);
      setApiKey('');
      setApiFeedback(`Vinculacao API atualizada em ${saved.updatedAtLabel}.`);
      setActionError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar vinculacao API.';
      setApiFeedback(message);
    } finally {
      setIsSavingApi(false);
    }
  };

  const handleUpdateOfferStatus = async (offer: PartnershipOffer, status: PartnershipOffer['status']) => {
    try {
      setIsUpdatingOffer(true);
      await integratorService.updateOfferStatus(offer.id, status);
      setOffers((prev) => prev.map((item) => (item.id === offer.id ? { ...item, status } : item)));
      setSelectedOfferId(offer.id);
      setActionError(null);
    } catch {
      setActionError('Nao foi possivel atualizar o status da oferta.');
    } finally {
      setIsUpdatingOffer(false);
    }
  };

  const filteredProducers = useMemo(() => {
    const normalizedFilter = producerFilter.trim().toLowerCase();
    return producers.filter((producer) => {
      const byStage = targetStage === 'Todos' || producer.productionType === targetStage;
      const byText =
        normalizedFilter.length === 0 ||
        producer.maskedName.toLowerCase().includes(normalizedFilter) ||
        producer.region.toLowerCase().includes(normalizedFilter);
      return byStage && byText;
    });
  }, [producerFilter, producers, targetStage]);

  const contractedProducers = useMemo(
    () => producers.filter((producer) => getStatusTone(producer.status) === 'contracted'),
    [producers]
  );

  const openOffers = useMemo(() => offers.filter((offer) => offer.status === 'Aberta'), [offers]);

  const contractSchedule = useMemo<ContractScheduleRow[]>(
    () =>
      contractedProducers.map((producer, index) => ({
        id: `CTR-${producer.id}`,
        producerName: producer.maskedName,
        development: producer.productionType,
        contractType: offers[index % Math.max(offers.length, 1)]?.type ?? 'Compra Garantida',
        nextReportDate: dateOffset((index + 1) * 5),
        estimatedVolume: producer.capacity,
        status: index % 3 === 0 ? 'Aguardando Assinatura' : index % 4 === 0 ? 'Finalizado' : 'Em Execucao',
      })),
    [contractedProducers, offers]
  );

  const financeEntries = useMemo<FinanceEntry[]>(
    () =>
      contractSchedule.slice(0, 8).map((contract, index) => ({
        id: `FIN-${contract.id}`,
        operation: `${contract.contractType} - ${contract.producerName}`,
        type: index % 2 === 0 ? 'Investimento' : 'Antecipacao',
        amount: 45000 + index * 9200,
        status: index % 3 === 0 ? 'Analise' : index % 4 === 0 ? 'Liquidado' : 'Ativo',
      })),
    [contractSchedule]
  );

  const receivables = useMemo<ReceivableRow[]>(
    () =>
      contractSchedule.slice(0, 10).map((contract, index) => ({
        id: `REC-${contract.id}`,
        contractRef: contract.id,
        producer: contract.producerName,
        amount: 18000 + index * 3500,
        dueDate: dateOffset((index + 1) * 6),
        status: index % 4 === 0 ? 'Liquidado' : index % 3 === 0 ? 'Em Escrow' : 'Pendente',
      })),
    [contractSchedule]
  );

  const payments = useMemo<PaymentRow[]>(
    () =>
      receivables.slice(0, 10).map((receivable, index) => ({
        id: `PAY-${receivable.id}`,
        destination: receivable.producer,
        amount: Math.max(receivable.amount * 0.78, 0),
        dueDate: dateOffset((index + 1) * 4),
        method: index % 3 === 0 ? 'Escrow Release' : index % 2 === 0 ? 'Asaas Split' : 'PIX',
        status: index % 4 === 0 ? 'Pago' : index % 3 === 0 ? 'Processando' : 'Agendado',
      })),
    [receivables]
  );

  const selectedProducer = useMemo(
    () => producers.find((producer) => producer.id === selectedProducerId) ?? null,
    [producers, selectedProducerId]
  );

  const selectedOffer = useMemo(
    () => offers.find((offer) => offer.id === selectedOfferId) ?? null,
    [offers, selectedOfferId]
  );

  const totalFinanceExposure = useMemo(
    () => financeEntries.filter((entry) => entry.status !== 'Liquidado').reduce((sum, entry) => sum + entry.amount, 0),
    [financeEntries]
  );

  const pendingReceivables = useMemo(
    () => receivables.filter((receivable) => receivable.status !== 'Liquidado').reduce((sum, receivable) => sum + receivable.amount, 0),
    [receivables]
  );

  const scheduledPayments = useMemo(
    () => payments.filter((payment) => payment.status !== 'Pago').reduce((sum, payment) => sum + payment.amount, 0),
    [payments]
  );

  if (isLoading) {
    return <LoadingSpinner text="Carregando integracao..." />;
  }

  if (loadError) {
    return <div className="p-6 bg-red-50 text-red-700 border border-red-200 rounded-lg">{loadError}</div>;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Portal da Integradora</h2>
          <p className="text-slate-600">Gestao central de produtores, demandas, contratos, financeiro, recebiveis e pagamentos.</p>
        </div>
        <div className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm flex items-center shadow-lg">
          <ShieldCheckIcon className="h-5 w-5 mr-2 text-emerald-400" />
          <span>{apiLink?.status === 'ATIVA' ? 'API vinculada e operacao auditada ativa' : 'Integracao via API e operacao auditada ativa'}</span>
        </div>
      </div>
      {actionError && (
        <div className="mb-6 p-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard title="Produtores Contratados" value={contractedProducers.length.toString()} icon={UsersIcon} color="text-indigo-600" />
        <KpiCard title="Recebiveis em Aberto" value={formatCurrency(pendingReceivables)} icon={CashIcon} color="text-amber-600" />
        <KpiCard title="Pagamentos Programados" value={formatCurrency(scheduledPayments)} icon={BriefcaseIcon} color="text-emerald-600" />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-slate-800">Vinculacao API da Industria</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${apiLink?.status === 'ATIVA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {apiLink?.status ?? 'PENDENTE'}
          </span>
        </div>
        <form onSubmit={handleSaveApiLink} className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input value={apiCompanyName} onChange={(e) => setApiCompanyName(e.target.value)} placeholder="Razao social" className="md:col-span-1 p-2 border border-slate-300 rounded text-sm" />
          <input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} placeholder="URL base API" className="md:col-span-1 p-2 border border-slate-300 rounded text-sm" />
          <input value={apiClientId} onChange={(e) => setApiClientId(e.target.value)} placeholder="Client ID" className="md:col-span-1 p-2 border border-slate-300 rounded text-sm" />
          <select value={apiAuthMode} onChange={(e) => setApiAuthMode(e.target.value as IntegratorApiAuthMode)} className="md:col-span-1 p-2 border border-slate-300 rounded text-sm bg-white">
            <option value="API">Modo API</option>
            <option value="LOGIN">Modo Login</option>
          </select>
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={apiLink?.apiKeyHint ? `Chave atual ****${apiLink.apiKeyHint}` : 'API key'} className="md:col-span-1 p-2 border border-slate-300 rounded text-sm" />
          <button type="submit" disabled={isSavingApi} className="md:col-span-5 px-3 py-2 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
            {isSavingApi ? 'Vinculando...' : 'Salvar e validar vinculacao API'}
          </button>
        </form>
        {apiFeedback && <p className="mt-2 text-xs text-indigo-700">{apiFeedback}</p>}
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden min-h-[540px]">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 border-b border-slate-200">
          {[
            { key: 'PRODUCERS', label: 'Produtores' },
            { key: 'DEMANDS', label: 'Cadastrar Demanda' },
            { key: 'OFFERS', label: 'Ofertas Recebidas' },
            { key: 'CONTRACT_SCHEDULE', label: 'Escala Contratos' },
            { key: 'FINANCE', label: 'Financeiro' },
            { key: 'RECEIVABLES', label: 'Recebiveis' },
            { key: 'PAYMENTS', label: 'Pagamentos' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as IntegratorTab)}
              className={`py-3 text-xs font-bold transition-colors ${activeTab === tab.key ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'PRODUCERS' && (
            <div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex flex-col lg:flex-row lg:items-center gap-3">
                <h3 className="font-bold text-slate-800 lg:mr-auto">Visualizacao de Produtores e Desenvolvimento Contratual</h3>
                <select value={targetStage} onChange={(e) => setTargetStage(e.target.value)} className="p-2 border border-slate-300 rounded-md text-sm bg-white">
                  <option value="Todos">Todas as fases</option>
                  <option value="Cria">Cria</option>
                  <option value="Recria">Recria</option>
                  <option value="Engorda">Engorda</option>
                  <option value="Ciclo Completo">Ciclo Completo</option>
                  <option value="Agricultura">Agricultura</option>
                </select>
                <input value={producerFilter} onChange={(e) => setProducerFilter(e.target.value)} placeholder="Filtrar produtor ou regiao" className="p-2 border border-slate-300 rounded-md text-sm w-full lg:w-72" />
              </div>

              {filteredProducers.length === 0 ? (
                <div className="p-6 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600">Nenhum produtor encontrado com os filtros selecionados.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredProducers.map((producer) => {
                    const tone = getStatusTone(producer.status);
                    const statusColor = tone === 'contracted' ? 'bg-emerald-100 text-emerald-700' : tone === 'negotiating' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';
                    return (
                      <div key={producer.id} className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase">Perfil Auditado</span>
                            <h4 className="text-lg font-bold text-slate-800 mt-1">{producer.maskedName}</h4>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor}`}>{producer.status}</span>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600">
                          <p className="flex items-center"><BriefcaseIcon className="h-4 w-4 mr-2 text-slate-400" />Desenvolvimento: <span className="ml-1 font-semibold">{producer.productionType}</span></p>
                          <p className="flex items-center"><MapIcon className="h-4 w-4 mr-2 text-slate-400" />{producer.region}</p>
                          <p className="flex items-center"><CubeIcon className="h-4 w-4 mr-2 text-slate-400" />Capacidade: <span className="ml-1 font-semibold">{producer.capacity}</span></p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                          <div className="flex items-center text-xs text-slate-500"><CheckCircleIcon className="h-3 w-3 mr-1 text-emerald-500" />Score {producer.auditScore}</div>
                          <button onClick={() => setSelectedProducerId(producer.id)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-bold hover:bg-indigo-700 transition-colors">Detalhar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedProducer && (
                <div className="mt-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="md:mr-auto">
                      <h4 className="text-lg font-bold text-indigo-900">{selectedProducer.maskedName}</h4>
                      <p className="text-sm text-indigo-700">Contrato em desenvolvimento com foco em {selectedProducer.productionType} e clausulas de entrega auditada.</p>
                    </div>
                    <button onClick={() => setActiveTab('CONTRACT_SCHEDULE')} className="px-4 py-2 bg-indigo-700 text-white rounded-md text-sm font-semibold hover:bg-indigo-800 transition-colors">Abrir contrato</button>
                    <button onClick={() => setActiveTab('OFFERS')} className="px-4 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-md text-sm font-semibold hover:bg-indigo-100 transition-colors">Ver historico</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'DEMANDS' && (
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Cadastro de Demanda da Industria</h3>
              <form onSubmit={handleCreateDemand} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6">
                <input value={demandTitle} onChange={(e) => setDemandTitle(e.target.value)} placeholder="Titulo da demanda" className="p-2 border border-slate-300 rounded-md text-sm" />
                <input value={demandDescription} onChange={(e) => setDemandDescription(e.target.value)} placeholder="Descricao tecnica e prazo" className="p-2 border border-slate-300 rounded-md text-sm" />
                <select value={demandType} onChange={(e) => setDemandType(e.target.value as PartnershipOffer['type'])} className="p-2 border border-slate-300 rounded-md text-sm bg-white">
                  <option value="Compra Garantida">Compra Garantida</option>
                  <option value="Fomento (Insumos)">Fomento (Insumos)</option>
                  <option value="Integracao Vertical">Integracao Vertical</option>
                  <option value="Parceria Estrategica">Parceria Estrategica</option>
                </select>
                <button type="submit" className="flex items-center justify-center px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors font-semibold text-sm">
                  <PlusCircleIcon className="h-4 w-4 mr-2" />Cadastrar demanda
                </button>
              </form>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {offers.map((offer) => (
                  <div key={offer.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="font-bold text-slate-800">{offer.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{offer.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold rounded ${offer.status === 'Aberta' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{offer.status}</span>
                    </div>
                    <div className="text-xs mt-3 text-slate-500 flex justify-between"><span>Modelo: {offer.type}</span><span>{offer.applicants} candidatos</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'OFFERS' && (
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-4">Ofertas Recebidas</h3>
              <p className="text-sm text-slate-600 mb-4">Consolidado de retorno dos produtores para demandas em aberto com trilha de auditoria e priorizacao.</p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600"><tr><th className="text-left p-3">Demanda</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Candidatos</th><th className="text-left p-3">Status</th><th className="text-left p-3">Acao</th></tr></thead>
                  <tbody>
                    {offers.map((offer) => (
                      <tr key={offer.id} className="border-t border-slate-100">
                        <td className="p-3 font-semibold text-slate-700">{offer.title}</td>
                        <td className="p-3">{offer.type}</td>
                        <td className="p-3">{offer.applicants}</td>
                        <td className="p-3">{offer.status}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button onClick={() => setSelectedOfferId(offer.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors">Detalhar</button>
                            <button onClick={() => void handleUpdateOfferStatus(offer, offer.status === 'Aberta' ? 'Encerrada' : 'Aberta')} disabled={isUpdatingOffer} className="px-3 py-1.5 bg-slate-700 text-white text-xs font-semibold rounded hover:bg-slate-800 transition-colors disabled:opacity-60">{offer.status === 'Aberta' ? 'Encerrar' : 'Reabrir'}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedOffer && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                  <h4 className="font-bold text-blue-900">Detalhe da Oferta {selectedOffer.id}</h4>
                  <p className="text-sm text-blue-800 mt-1">{selectedOffer.title}</p>
                  <p className="text-sm text-blue-700 mt-1">{selectedOffer.description}</p>
                  <div className="text-xs text-blue-700 mt-2 flex gap-3"><span>Modelo: {selectedOffer.type}</span><span>Candidatos: {selectedOffer.applicants}</span><span>Status: {selectedOffer.status}</span></div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'CONTRACT_SCHEDULE' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">Escala de Contratos</h3>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-700">
                  {contractSchedule.length} contratos mapeados
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Planejamento de execucao por produtor, com proximas entregas e acompanhamento de status contratual.
              </p>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left p-3">Contrato</th>
                      <th className="text-left p-3">Produtor</th>
                      <th className="text-left p-3">Desenvolvimento</th>
                      <th className="text-left p-3">Proximo Relatorio</th>
                      <th className="text-left p-3">Volume</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractSchedule.map((contract) => (
                      <tr key={contract.id} className="border-t border-slate-100">
                        <td className="p-3 font-semibold text-slate-700">{contract.id}</td>
                        <td className="p-3">{contract.producerName}</td>
                        <td className="p-3">{contract.development}</td>
                        <td className="p-3">{contract.nextReportDate}</td>
                        <td className="p-3">{contract.estimatedVolume}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              contract.status === 'Em Execucao'
                                ? 'bg-emerald-100 text-emerald-700'
                                : contract.status === 'Aguardando Assinatura'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {contract.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'FINANCE' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <div className="flex items-center text-indigo-700 text-sm font-semibold">
                    <TrendingUpIcon className="h-4 w-4 mr-2" />
                    Exposicao em Aberto
                  </div>
                  <p className="text-2xl font-bold text-indigo-900 mt-2">{formatCurrency(totalFinanceExposure)}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <div className="text-amber-700 text-sm font-semibold">Ofertas em aberto</div>
                  <p className="text-2xl font-bold text-amber-900 mt-2">{openOffers.length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                  <div className="text-emerald-700 text-sm font-semibold">Pagamentos planejados</div>
                  <p className="text-2xl font-bold text-emerald-900 mt-2">{formatCurrency(scheduledPayments)}</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left p-3">Operacao</th>
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-left p-3">Valor</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financeEntries.map((entry) => (
                      <tr key={entry.id} className="border-t border-slate-100">
                        <td className="p-3 font-semibold text-slate-700">{entry.operation}</td>
                        <td className="p-3">{entry.type}</td>
                        <td className="p-3">{formatCurrency(entry.amount)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              entry.status === 'Ativo'
                                ? 'bg-emerald-100 text-emerald-700'
                                : entry.status === 'Analise'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'RECEIVABLES' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">Recebiveis</h3>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-700">
                  Em aberto: {formatCurrency(pendingReceivables)}
                </span>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left p-3">Referencia</th>
                      <th className="text-left p-3">Produtor</th>
                      <th className="text-left p-3">Vencimento</th>
                      <th className="text-left p-3">Valor</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivables.map((receivable) => (
                      <tr key={receivable.id} className="border-t border-slate-100">
                        <td className="p-3 font-semibold text-slate-700">{receivable.contractRef}</td>
                        <td className="p-3">{receivable.producer}</td>
                        <td className="p-3">{receivable.dueDate}</td>
                        <td className="p-3">{formatCurrency(receivable.amount)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              receivable.status === 'Pendente'
                                ? 'bg-amber-100 text-amber-700'
                                : receivable.status === 'Em Escrow'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {receivable.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'PAYMENTS' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-800">Pagamentos</h3>
                <span className="text-xs font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-700">
                  Programado: {formatCurrency(scheduledPayments)}
                </span>
              </div>
              <div className="p-3 mb-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center">
                <LockClosedIcon className="h-4 w-4 mr-2 text-slate-500" />
                Fluxo protegido com conciliacao entre split financeiro, escrow e trilha de auditoria.
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left p-3">Destino</th>
                      <th className="text-left p-3">Metodo</th>
                      <th className="text-left p-3">Vencimento</th>
                      <th className="text-left p-3">Valor</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-t border-slate-100">
                        <td className="p-3 font-semibold text-slate-700">{payment.destination}</td>
                        <td className="p-3">{payment.method}</td>
                        <td className="p-3">{payment.dueDate}</td>
                        <td className="p-3">{formatCurrency(payment.amount)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded ${
                              payment.status === 'Agendado'
                                ? 'bg-amber-100 text-amber-700'
                                : payment.status === 'Processando'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegratorDashboard;
