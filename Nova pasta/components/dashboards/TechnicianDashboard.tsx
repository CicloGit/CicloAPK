
import React, { useEffect, useMemo, useState } from 'react';
import UsersIcon from '../icons/UsersIcon';
import ClipboardListIcon from '../icons/ClipboardListIcon';
import DocumentTextIcon from '../icons/DocumentTextIcon';
import ChartBarIcon from '../icons/ChartBarIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useApp } from '../../contexts/AppContext';
import {
  CouncilType,
  TechnicianDocumentType,
  TechnicianFieldReport,
  TechnicianProducerDemand,
  TechnicianProducerFollowUp,
  TechnicianRuleUpdate,
  TechnicianTask,
  TechnicianTaskStatus,
  TechnicianTechnicalDocument,
  TechnicianVisitPlan,
} from '../../types';
import { technicianService } from '../../services/technicianService';

type TechnicianTab = 'OVERVIEW' | 'PRODUCERS' | 'VISITS' | 'REPORTS' | 'DOCUMENTS' | 'RULES';

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.FC<{ className?: string }>;
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-2 flex items-center gap-2 text-slate-500">
      <Icon className="h-5 w-5" />
      <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
    </div>
    <p className="text-3xl font-bold text-slate-900">{value}</p>
  </div>
);

const tabLabel: Record<TechnicianTab, string> = {
  OVERVIEW: 'Visao Geral',
  PRODUCERS: 'Produtores',
  VISITS: 'Agenda e Tarefas',
  REPORTS: 'Relatorios',
  DOCUMENTS: 'Laudo / TRT / Receituario',
  RULES: 'Normativas e Produtos',
};

const taskTone: Record<TechnicianTaskStatus, string> = {
  PENDENTE: 'border-slate-200 bg-slate-50 text-slate-700',
  CONCLUIDA: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ATRASADA: 'border-red-200 bg-red-50 text-red-700',
};

const asDateLabel = (raw: string): string => {
  if (!raw) return '-';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  return parsed.toLocaleString('pt-BR');
};

const regionMatches = (ruleRegion: string, targetRegion: string): boolean => {
  if (!targetRegion) return true;
  const normalizedRuleRegion = ruleRegion.toUpperCase();
  const normalizedTarget = targetRegion.toUpperCase();
  if (normalizedRuleRegion === 'NACIONAL') return true;
  if (normalizedRuleRegion === 'CENTRO-OESTE') {
    return ['MT', 'MS', 'GO', 'DF'].includes(normalizedTarget);
  }
  return normalizedRuleRegion === normalizedTarget;
};

const TechnicianDashboard: React.FC = () => {
  const { currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<TechnicianTab>('OVERVIEW');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partialWarnings, setPartialWarnings] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [followUps, setFollowUps] = useState<TechnicianProducerFollowUp[]>([]);
  const [demands, setDemands] = useState<TechnicianProducerDemand[]>([]);
  const [visits, setVisits] = useState<TechnicianVisitPlan[]>([]);
  const [tasks, setTasks] = useState<TechnicianTask[]>([]);
  const [reports, setReports] = useState<TechnicianFieldReport[]>([]);
  const [documents, setDocuments] = useState<TechnicianTechnicalDocument[]>([]);
  const [ruleUpdates, setRuleUpdates] = useState<TechnicianRuleUpdate[]>([]);
  const [productRules, setProductRules] = useState<Awaited<ReturnType<typeof technicianService.listProductRules>>>([]);

  const [selectedProducerId, setSelectedProducerId] = useState<string>('');
  const [ruleRegionFilter, setRuleRegionFilter] = useState<string>('MT');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftPreview, setDraftPreview] = useState('');
  const [draftWarnings, setDraftWarnings] = useState<string[]>([]);

  const [visitForm, setVisitForm] = useState({
    producerId: '',
    scheduledAt: '',
    notes: '',
  });

  const [taskForm, setTaskForm] = useState({
    producerId: '',
    title: '',
    description: '',
    dueDate: '',
  });

  const [reportForm, setReportForm] = useState({
    producerId: '',
    title: '',
    summary: '',
    imageUrlsText: '',
    evidenceReference: '',
  });

  const defaultCouncilType: CouncilType = currentUser?.councilType ?? 'CRMV';
  const [documentForm, setDocumentForm] = useState<{
    producerId: string;
    documentType: TechnicianDocumentType;
    category: string;
    councilType: CouncilType;
    councilNumber: string;
    region: string;
    activity: string;
    diagnosis: string;
    selectedProductIds: string[];
    evidenceReference: string;
  }>({
    producerId: '',
    documentType: 'LAUDO',
    category: currentUser?.specialty ?? 'Assistencia tecnica',
    councilType: defaultCouncilType,
    councilNumber: currentUser?.councilNumber ?? '',
    region: 'MT',
    activity: 'Agricultura',
    diagnosis: '',
    selectedProductIds: [],
    evidenceReference: '',
  });

  const technicianUserId = currentUser?.uid?.trim() ? currentUser.uid : 'TECH-LOCAL';
  const actorLabel = currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'Tecnico';
  const toErrorMessage = (reason: unknown) => (reason instanceof Error ? reason.message : 'erro desconhecido');

  const selectedProducer = useMemo(
    () => followUps.find((item) => item.producerId === selectedProducerId) ?? null,
    [followUps, selectedProducerId]
  );

  const filteredDemands = useMemo(
    () => (selectedProducerId ? demands.filter((item) => item.producerId === selectedProducerId) : demands),
    [demands, selectedProducerId]
  );
  const filteredVisits = useMemo(
    () => (selectedProducerId ? visits.filter((item) => item.producerId === selectedProducerId) : visits),
    [visits, selectedProducerId]
  );
  const filteredTasks = useMemo(
    () => (selectedProducerId ? tasks.filter((item) => item.producerId === selectedProducerId) : tasks),
    [tasks, selectedProducerId]
  );
  const filteredReports = useMemo(
    () => (selectedProducerId ? reports.filter((item) => item.producerId === selectedProducerId) : reports),
    [reports, selectedProducerId]
  );
  const filteredDocuments = useMemo(
    () => (selectedProducerId ? documents.filter((item) => item.producerId === selectedProducerId) : documents),
    [documents, selectedProducerId]
  );

  const visibleRuleUpdates = useMemo(
    () => ruleUpdates.filter((item) => regionMatches(item.region, ruleRegionFilter)),
    [ruleUpdates, ruleRegionFilter]
  );

  const filteredProductRules = useMemo(() => {
    const normalizedActivity = documentForm.activity.trim().toUpperCase();
    return productRules.filter(
      (item) =>
        item.allowedActivities.length === 0 ||
        item.allowedActivities.some((activity) => activity.toUpperCase() === normalizedActivity)
    );
  }, [documentForm.activity, productRules]);

  const openDemandsCount = demands.filter((item) => item.status !== 'CONCLUIDA').length;
  const completedVisitsCount = visits.filter((item) => item.status === 'CONCLUIDA').length;
  const completedTasksCount = tasks.filter((item) => item.status === 'CONCLUIDA').length;
  const overdueTasksCount = tasks.filter((item) => item.status === 'ATRASADA').length;

  const syncProducerOnForms = (producerId: string) => {
    const producer = followUps.find((item) => item.producerId === producerId);
    setVisitForm((prev) => ({ ...prev, producerId }));
    setTaskForm((prev) => ({ ...prev, producerId }));
    setReportForm((prev) => ({ ...prev, producerId }));
    setDocumentForm((prev) => ({
      ...prev,
      producerId,
      region: producer?.region ?? prev.region,
      activity: producer?.activity ?? prev.activity,
    }));
  };

  const loadPortal = async () => {
    setIsLoading(true);
    setLoadError(null);
    setPartialWarnings([]);
    const [loadedFollowUps, loadedDemands, loadedVisits, loadedTasks, loadedReports, loadedDocuments, loadedRules, loadedProducts] =
      await Promise.allSettled([
        technicianService.listProducerFollowUps(technicianUserId),
        technicianService.listDemands(technicianUserId),
        technicianService.listVisits(technicianUserId),
        technicianService.listTasks(technicianUserId),
        technicianService.listFieldReports(technicianUserId),
        technicianService.listDocuments(technicianUserId),
        technicianService.listRuleUpdates(),
        technicianService.listProductRules(),
      ]);

    const warnings: string[] = [];
    let hasAnySuccess = false;

    if (loadedFollowUps.status === 'fulfilled') {
      const rows = loadedFollowUps.value;
      setFollowUps(rows);
      hasAnySuccess = true;
      if (!selectedProducerId && rows.length > 0) {
        setSelectedProducerId(rows[0].producerId);
        syncProducerOnForms(rows[0].producerId);
      }
    } else {
      setFollowUps([]);
      warnings.push(`Produtores: ${toErrorMessage(loadedFollowUps.reason)}`);
    }

    if (loadedDemands.status === 'fulfilled') {
      setDemands(loadedDemands.value);
      hasAnySuccess = true;
    } else {
      setDemands([]);
      warnings.push(`Demandas: ${toErrorMessage(loadedDemands.reason)}`);
    }

    if (loadedVisits.status === 'fulfilled') {
      setVisits(loadedVisits.value);
      hasAnySuccess = true;
    } else {
      setVisits([]);
      warnings.push(`Visitas: ${toErrorMessage(loadedVisits.reason)}`);
    }

    if (loadedTasks.status === 'fulfilled') {
      setTasks(loadedTasks.value);
      hasAnySuccess = true;
    } else {
      setTasks([]);
      warnings.push(`Tarefas: ${toErrorMessage(loadedTasks.reason)}`);
    }

    if (loadedReports.status === 'fulfilled') {
      setReports(loadedReports.value);
      hasAnySuccess = true;
    } else {
      setReports([]);
      warnings.push(`Relatorios: ${toErrorMessage(loadedReports.reason)}`);
    }

    if (loadedDocuments.status === 'fulfilled') {
      setDocuments(loadedDocuments.value);
      hasAnySuccess = true;
    } else {
      setDocuments([]);
      warnings.push(`Documentos tecnicos: ${toErrorMessage(loadedDocuments.reason)}`);
    }

    if (loadedRules.status === 'fulfilled') {
      setRuleUpdates(loadedRules.value);
      hasAnySuccess = true;
    } else {
      setRuleUpdates([]);
      warnings.push(`Normativas: ${toErrorMessage(loadedRules.reason)}`);
    }

    if (loadedProducts.status === 'fulfilled') {
      setProductRules(loadedProducts.value);
      hasAnySuccess = true;
    } else {
      setProductRules([]);
      warnings.push(`Produtos tecnicos: ${toErrorMessage(loadedProducts.reason)}`);
    }

    if (!hasAnySuccess) {
      setLoadError('Nao foi possivel carregar o portal tecnico.');
    } else if (warnings.length > 0) {
      setPartialWarnings(warnings);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadPortal();
  }, []);

  useEffect(() => {
    if (!selectedProducerId && followUps.length > 0) {
      setSelectedProducerId(followUps[0].producerId);
      syncProducerOnForms(followUps[0].producerId);
    }
  }, [followUps, selectedProducerId]);

  const handleCreateVisit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    const producer = followUps.find((item) => item.producerId === visitForm.producerId);
    if (!producer || !visitForm.scheduledAt.trim()) {
      setActionError('Selecione produtor e data da visita.');
      return;
    }

    try {
      const created = await technicianService.scheduleVisit({
        technicianUserId,
        actor: actorLabel,
        producerId: producer.producerId,
        producerName: producer.producerName,
        scheduledAt: visitForm.scheduledAt,
        notes: visitForm.notes,
      });
      setVisits((prev) => [created, ...prev]);
      setVisitForm((prev) => ({ ...prev, scheduledAt: '', notes: '' }));
      setActionMessage('Visita agendada com sucesso.');
    } catch (error) {
      setActionError(toErrorMessage(error));
    }
  };

  const handleToggleCheckpoint = async (visit: TechnicianVisitPlan, checkpointId: string) => {
    const checkpoint = visit.checkpoints.find((item) => item.id === checkpointId);
    if (!checkpoint) return;
    setActionError(null);
    setActionMessage(null);
    try {
      const updated = await technicianService.updateVisitCheckpoint({
        visitId: visit.id,
        checkpointId,
        done: !checkpoint.done,
        actor: actorLabel,
      });
      setVisits((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setActionMessage('Checkpoint atualizado.');
    } catch (error) {
      setActionError(toErrorMessage(error));
    }
  };

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    const producer = followUps.find((item) => item.producerId === taskForm.producerId);
    if (!producer || !taskForm.title.trim()) {
      setActionError('Selecione produtor e informe o titulo da tarefa.');
      return;
    }

    try {
      const created = await technicianService.createTask({
        technicianUserId,
        actor: actorLabel,
        producerId: producer.producerId,
        producerName: producer.producerName,
        title: taskForm.title,
        description: taskForm.description,
        dueDate: taskForm.dueDate,
      });
      setTasks((prev) => [created, ...prev]);
      setTaskForm((prev) => ({ ...prev, title: '', description: '', dueDate: '' }));
      setActionMessage('Tarefa registrada com sucesso.');
    } catch (error) {
      setActionError(toErrorMessage(error));
    }
  };

  const handleTaskStatus = async (task: TechnicianTask, status: TechnicianTaskStatus) => {
    setActionError(null);
    setActionMessage(null);
    try {
      const updated = await technicianService.setTaskStatus({
        taskId: task.id,
        status,
        actor: actorLabel,
      });
      setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setActionMessage(`Tarefa atualizada para ${status}.`);
    } catch (error) {
      setActionError(toErrorMessage(error));
    }
  };

  const handleCreateReport = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    const producer = followUps.find((item) => item.producerId === reportForm.producerId);
    if (!producer || !reportForm.title.trim() || !reportForm.summary.trim()) {
      setActionError('Selecione produtor e informe titulo/resumo do relatorio.');
      return;
    }
    if (!reportForm.evidenceReference.trim()) {
      setActionError('Informe a referencia de evidencia digital para registrar o relatorio.');
      return;
    }

    const imageUrls = reportForm.imageUrlsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (imageUrls.length === 0) {
      setActionError('Informe pelo menos uma imagem (URL) do relatorio.');
      return;
    }

    try {
      const created = await technicianService.createFieldReport({
        technicianUserId,
        actor: actorLabel,
        producerId: producer.producerId,
        producerName: producer.producerName,
        title: reportForm.title,
        summary: reportForm.summary,
        imageUrls,
        evidenceReference: reportForm.evidenceReference,
      });
      setReports((prev) => [created, ...prev]);
      setReportForm((prev) => ({
        ...prev,
        title: '',
        summary: '',
        imageUrlsText: '',
        evidenceReference: '',
      }));
      setActionMessage('Relatorio tecnico registrado com evidencia imutavel.');
    } catch (error) {
      setActionError(toErrorMessage(error));
    }
  };

  const handleToggleDocumentProduct = (productId: string) => {
    setDocumentForm((prev) => ({
      ...prev,
      selectedProductIds: prev.selectedProductIds.includes(productId)
        ? prev.selectedProductIds.filter((entry) => entry !== productId)
        : [...prev.selectedProductIds, productId],
    }));
  };

  const handleGenerateDraft = async () => {
    setActionError(null);
    setActionMessage(null);
    setIsGeneratingDraft(true);
    try {
      const producerName = followUps.find((item) => item.producerId === documentForm.producerId)?.producerName ?? 'Produtor';
      const draft = await technicianService.buildPrescriptionDraft({
        documentType: documentForm.documentType,
        producerName,
        region: documentForm.region,
        activity: documentForm.activity,
        category: documentForm.category,
        councilType: documentForm.councilType,
        councilNumber: documentForm.councilNumber,
        diagnosis: documentForm.diagnosis,
        selectedProductIds: documentForm.selectedProductIds,
      });
      setDraftPreview(draft.draftText);
      setDraftWarnings(draft.warnings);
      setActionMessage('Pre-documento gerado para conferencia.');
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleIssueDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    const producer = followUps.find((item) => item.producerId === documentForm.producerId);
    if (!producer) {
      setActionError('Selecione o produtor para emitir o documento.');
      return;
    }
    if (!documentForm.diagnosis.trim()) {
      setActionError('Informe o diagnostico tecnico antes de emitir.');
      return;
    }
    if (!documentForm.evidenceReference.trim()) {
      setActionError('Informe a evidencia digital para emissao do documento.');
      return;
    }

    try {
      const created = await technicianService.issueTechnicalDocument({
        technicianUserId,
        actor: actorLabel,
        producerId: producer.producerId,
        producerName: producer.producerName,
        region: documentForm.region,
        activity: documentForm.activity,
        category: documentForm.category,
        councilType: documentForm.councilType,
        councilNumber: documentForm.councilNumber,
        documentType: documentForm.documentType,
        diagnosis: documentForm.diagnosis,
        selectedProductIds: documentForm.selectedProductIds,
        evidenceReference: documentForm.evidenceReference,
      });

      setDocuments((prev) => [created, ...prev]);
      setDraftPreview(created.draftText);
      setDraftWarnings(created.warnings);
      setActionMessage(`${created.documentType} emitido com auditoria imutavel.`);
    } catch (error) {
      setActionError(toErrorMessage(error));
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando portal tecnico..." />;
  }

  if (loadError) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">{loadError}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-bold text-slate-900">Portal Tecnico</h2>
        <p className="mt-2 text-sm text-slate-600">
          Emissao de laudos, TRT e receituario por conselho tecnico, com agenda operacional, evidencias digitais e rastreabilidade imutavel.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Conselho: <span className="font-semibold text-slate-700">{documentForm.councilType}</span> | Registro:{' '}
          <span className="font-semibold text-slate-700">{documentForm.councilNumber || 'nao informado'}</span>
        </p>
      </header>

      {partialWarnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Carregamento parcial: {partialWarnings.slice(0, 4).join(' | ')}
        </div>
      )}
      {actionMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{actionMessage}</div>
      )}
      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-slate-200 p-1">
        {(Object.keys(tabLabel) as TechnicianTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-300'
            }`}
            type="button"
          >
            {tabLabel[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'OVERVIEW' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Produtores acompanhados" value={String(followUps.length)} icon={UsersIcon} />
            <KpiCard title="Demandas abertas" value={String(openDemandsCount)} icon={ClipboardListIcon} />
            <KpiCard title="Visitas concluidas" value={String(completedVisitsCount)} icon={CheckCircleIcon} />
            <KpiCard title="Tarefas em atraso" value={String(overdueTasksCount)} icon={ChartBarIcon} />
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Proximas visitas</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {filteredVisits.slice(0, 6).map((visit) => (
                  <li key={visit.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="font-semibold">{visit.producerName}</p>
                    <p className="text-xs text-slate-500">{asDateLabel(visit.scheduledAt)}</p>
                  </li>
                ))}
                {filteredVisits.length === 0 && <li className="text-slate-500">Nenhuma visita cadastrada.</li>}
              </ul>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Demandas do produtor</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {filteredDemands.slice(0, 6).map((demand) => (
                  <li key={demand.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="font-semibold">{demand.title}</p>
                    <p className="text-xs text-slate-500">{demand.producerName}</p>
                  </li>
                ))}
                {filteredDemands.length === 0 && <li className="text-slate-500">Nenhuma demanda ativa.</li>}
              </ul>
            </article>
          </div>
        </section>
      )}

      {activeTab === 'PRODUCERS' && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
            <h3 className="text-lg font-bold text-slate-900">Lista de produtores acompanhados</h3>
            <div className="mt-3 space-y-2">
              {followUps.map((producer) => (
                <button
                  key={producer.id}
                  onClick={() => {
                    setSelectedProducerId(producer.producerId);
                    syncProducerOnForms(producer.producerId);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedProducerId === producer.producerId
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                  type="button"
                >
                  <p className="font-semibold">{producer.producerName}</p>
                  <p className="text-xs">{producer.propertyName}</p>
                </button>
              ))}
              {followUps.length === 0 && <p className="text-sm text-slate-500">Nenhum produtor vinculado.</p>}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h3 className="text-lg font-bold text-slate-900">Detalhes e demandas</h3>
            {selectedProducer ? (
              <div className="mt-3 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p><span className="font-semibold">Produtor:</span> {selectedProducer.producerName}</p>
                  <p><span className="font-semibold">Atividade:</span> {selectedProducer.activity}</p>
                  <p><span className="font-semibold">Regiao:</span> {selectedProducer.region}</p>
                  <p><span className="font-semibold">Ultima visita:</span> {selectedProducer.lastVisitAt ? asDateLabel(selectedProducer.lastVisitAt) : 'Nao registrada'}</p>
                </div>
                <div className="space-y-2">
                  {filteredDemands.map((demand) => (
                    <div key={demand.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p className="font-semibold">{demand.title}</p>
                      <p className="text-xs text-slate-500">{demand.description}</p>
                      <p className="mt-1 text-xs">Prioridade: {demand.priority} | Status: {demand.status}</p>
                    </div>
                  ))}
                  {filteredDemands.length === 0 && <p className="text-sm text-slate-500">Sem demandas para este produtor.</p>}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Selecione um produtor para visualizar os detalhes.</p>
            )}
          </article>
        </section>
      )}

      {activeTab === 'VISITS' && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Agenda e checkpoints de visita</h3>
            <form onSubmit={handleCreateVisit} className="mt-3 grid grid-cols-1 gap-2">
              <select
                value={visitForm.producerId}
                onChange={(event) => setVisitForm((prev) => ({ ...prev, producerId: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
              >
                <option value="">Selecionar produtor</option>
                {followUps.map((producer) => (
                  <option key={producer.producerId} value={producer.producerId}>{producer.producerName}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={visitForm.scheduledAt}
                onChange={(event) => setVisitForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
              />
              <input
                value={visitForm.notes}
                onChange={(event) => setVisitForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
                placeholder="Observacoes da agenda"
              />
              <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">
                Agendar visita
              </button>
            </form>

            <div className="mt-4 space-y-3">
              {filteredVisits.map((visit) => (
                <div key={visit.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 text-sm">
                    <p className="font-semibold text-slate-800">{visit.producerName}</p>
                    <p className="text-xs text-slate-500">{asDateLabel(visit.scheduledAt)} | {visit.status}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {visit.checkpoints.map((checkpoint) => (
                      <button
                        key={checkpoint.id}
                        type="button"
                        onClick={() => handleToggleCheckpoint(visit, checkpoint.id)}
                        className={`rounded-md border px-2 py-1 text-left text-xs ${
                          checkpoint.done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {checkpoint.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {filteredVisits.length === 0 && <p className="text-sm text-slate-500">Nenhuma visita registrada.</p>}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Cumprimento de tarefas</h3>
            <form onSubmit={handleCreateTask} className="mt-3 grid grid-cols-1 gap-2">
              <select
                value={taskForm.producerId}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, producerId: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
              >
                <option value="">Selecionar produtor</option>
                {followUps.map((producer) => (
                  <option key={producer.producerId} value={producer.producerId}>{producer.producerName}</option>
                ))}
              </select>
              <input
                value={taskForm.title}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
                placeholder="Titulo da tarefa"
              />
              <input
                value={taskForm.description}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
                placeholder="Descricao da tarefa"
              />
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
              />
              <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">
                Registrar tarefa
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {filteredTasks.map((task) => (
                <div key={task.id} className={`rounded-lg border p-3 text-sm ${taskTone[task.status]}`}>
                  <p className="font-semibold">{task.title}</p>
                  <p className="text-xs">{task.producerName} | prazo: {task.dueDate ? asDateLabel(task.dueDate) : 'sem prazo'}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleTaskStatus(task, 'CONCLUIDA')}
                      className="rounded-md border border-emerald-300 px-2 py-1 text-xs text-emerald-700"
                    >
                      Concluir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTaskStatus(task, 'PENDENTE')}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    >
                      Reabrir
                    </button>
                  </div>
                </div>
              ))}
              {filteredTasks.length === 0 && <p className="text-sm text-slate-500">Nenhuma tarefa registrada.</p>}
            </div>
            <p className="mt-3 text-xs text-slate-500">Concluidas: {completedTasksCount} | Em atraso: {overdueTasksCount}</p>
          </article>
        </section>
      )}

      {activeTab === 'REPORTS' && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Registro de relatorios e imagens</h3>
            <form onSubmit={handleCreateReport} className="mt-3 grid grid-cols-1 gap-2">
              <select
                value={reportForm.producerId}
                onChange={(event) => setReportForm((prev) => ({ ...prev, producerId: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
              >
                <option value="">Selecionar produtor</option>
                {followUps.map((producer) => (
                  <option key={producer.producerId} value={producer.producerId}>{producer.producerName}</option>
                ))}
              </select>
              <input
                value={reportForm.title}
                onChange={(event) => setReportForm((prev) => ({ ...prev, title: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
                placeholder="Titulo do relatorio"
              />
              <textarea
                value={reportForm.summary}
                onChange={(event) => setReportForm((prev) => ({ ...prev, summary: event.target.value }))}
                className="min-h-[90px] rounded-md border border-slate-300 p-2 text-sm"
                placeholder="Resumo tecnico por produtor"
              />
              <textarea
                value={reportForm.imageUrlsText}
                onChange={(event) => setReportForm((prev) => ({ ...prev, imageUrlsText: event.target.value }))}
                className="min-h-[80px] rounded-md border border-slate-300 p-2 text-sm"
                placeholder="URLs das imagens (uma por linha ou separadas por virgula)"
              />
              <input
                value={reportForm.evidenceReference}
                onChange={(event) => setReportForm((prev) => ({ ...prev, evidenceReference: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
                placeholder="Referencia de evidencia (QR/hash/link)"
              />
              <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">
                Registrar relatorio
              </button>
            </form>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Historico de relatorios</h3>
            <div className="mt-3 space-y-2">
              {filteredReports.map((report) => (
                <div key={report.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold">{report.title}</p>
                  <p className="text-xs text-slate-500">{report.producerName} | {asDateLabel(report.createdAt)}</p>
                  <p className="mt-1 text-xs">{report.summary}</p>
                  <p className="mt-1 text-xs">Imagens: {report.imageUrls.length}</p>
                </div>
              ))}
              {filteredReports.length === 0 && <p className="text-sm text-slate-500">Nenhum relatorio registrado.</p>}
            </div>
          </article>
        </section>
      )}

      {activeTab === 'DOCUMENTS' && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Emissao de laudo, TRT e receituario</h3>
            <form onSubmit={handleIssueDocument} className="mt-3 grid grid-cols-1 gap-2">
              <select
                value={documentForm.producerId}
                onChange={(event) => setDocumentForm((prev) => ({ ...prev, producerId: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
              >
                <option value="">Selecionar produtor</option>
                {followUps.map((producer) => (
                  <option key={producer.producerId} value={producer.producerId}>{producer.producerName}</option>
                ))}
              </select>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={documentForm.documentType}
                  onChange={(event) =>
                    setDocumentForm((prev) => ({ ...prev, documentType: event.target.value as TechnicianDocumentType }))
                  }
                  className="rounded-md border border-slate-300 p-2 text-sm"
                >
                  <option value="LAUDO">Laudo</option>
                  <option value="TRT">TRT</option>
                  <option value="RECEITUARIO">Receituario</option>
                </select>
                <input
                  value={documentForm.category}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, category: event.target.value }))}
                  className="rounded-md border border-slate-300 p-2 text-sm"
                  placeholder="Categoria/foco tecnico"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={documentForm.councilType}
                  onChange={(event) =>
                    setDocumentForm((prev) => ({ ...prev, councilType: event.target.value as CouncilType }))
                  }
                  className="rounded-md border border-slate-300 p-2 text-sm"
                >
                  <option value="CRMV">CRMV</option>
                  <option value="CREA">CREA</option>
                  <option value="CFTA">CFTA</option>
                </select>
                <input
                  value={documentForm.councilNumber}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, councilNumber: event.target.value }))}
                  className="rounded-md border border-slate-300 p-2 text-sm"
                  placeholder="Numero do conselho"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={documentForm.region}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, region: event.target.value.toUpperCase() }))}
                  className="rounded-md border border-slate-300 p-2 text-sm"
                  placeholder="Regiao/UF"
                />
                <input
                  value={documentForm.activity}
                  onChange={(event) => setDocumentForm((prev) => ({ ...prev, activity: event.target.value }))}
                  className="rounded-md border border-slate-300 p-2 text-sm"
                  placeholder="Atividade (ex.: Piscicultura)"
                />
              </div>
              <textarea
                value={documentForm.diagnosis}
                onChange={(event) => setDocumentForm((prev) => ({ ...prev, diagnosis: event.target.value }))}
                className="min-h-[90px] rounded-md border border-slate-300 p-2 text-sm"
                placeholder="Diagnostico tecnico para emissao"
              />
              <input
                value={documentForm.evidenceReference}
                onChange={(event) => setDocumentForm((prev) => ({ ...prev, evidenceReference: event.target.value }))}
                className="rounded-md border border-slate-300 p-2 text-sm"
                placeholder="Referencia de evidencia digital (QR/hash/link)"
              />

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">Produtos e cruzamento de regras</p>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {filteredProductRules.map((product) => (
                    <label key={product.id} className="flex items-start gap-2 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={documentForm.selectedProductIds.includes(product.id)}
                        onChange={() => handleToggleDocumentProduct(product.id)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-semibold">{product.productName}</span> ({product.activeIngredient}) | TRT:{' '}
                        {product.requiresTrt ? 'sim' : 'nao'}
                      </span>
                    </label>
                  ))}
                  {filteredProductRules.length === 0 && (
                    <p className="text-xs text-slate-500">Nenhum produto compativel com a atividade informada.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleGenerateDraft}
                  disabled={isGeneratingDraft}
                  className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700"
                >
                  {isGeneratingDraft ? 'Gerando...' : 'Gerar pre-documento'}
                </button>
                <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700" type="submit">
                  Emitir documento
                </button>
              </div>
            </form>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Conferencia e historico</h3>
            {draftWarnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {draftWarnings.map((warning) => (
                  <p key={warning}>- {warning}</p>
                ))}
              </div>
            )}
            <textarea
              value={draftPreview}
              onChange={(event) => setDraftPreview(event.target.value)}
              className="mt-3 min-h-[220px] w-full rounded-md border border-slate-300 p-2 text-xs text-slate-700"
              placeholder="O pre-documento sera exibido aqui para conferencia."
            />
            <div className="mt-4 space-y-2">
              {filteredDocuments.slice(0, 10).map((document) => (
                <div key={document.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <p className="font-semibold">{document.documentType} | {document.producerName}</p>
                  <p>Status: {document.status} | Emissao: {asDateLabel(document.issuedAt ?? document.createdAt)}</p>
                  <p>Warnings: {document.warnings.length}</p>
                </div>
              ))}
              {filteredDocuments.length === 0 && <p className="text-sm text-slate-500">Nenhum documento emitido.</p>}
            </div>
          </article>
        </section>
      )}

      {activeTab === 'RULES' && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Atualizacoes normativas por regiao</h3>
            <div className="mt-3 flex gap-2">
              <input
                value={ruleRegionFilter}
                onChange={(event) => setRuleRegionFilter(event.target.value.toUpperCase())}
                className="w-full rounded-md border border-slate-300 p-2 text-sm"
                placeholder="Filtrar por regiao/UF"
              />
              <button
                type="button"
                onClick={() => void loadPortal()}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Atualizar
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {visibleRuleUpdates.map((rule) => (
                <div key={rule.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold">{rule.title}</p>
                  <p className="text-xs text-slate-500">{rule.region} | {asDateLabel(rule.publishedAt)}</p>
                  <p className="mt-1 text-xs">{rule.summary}</p>
                </div>
              ))}
              {visibleRuleUpdates.length === 0 && <p className="text-sm text-slate-500">Sem normativas cadastradas para o filtro informado.</p>}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Base de produtos e regras de bula</h3>
            <div className="mt-3 space-y-2">
              {productRules.map((product) => (
                <div key={product.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p className="font-semibold">{product.productName}</p>
                  <p className="text-xs">Ativo: {product.activeIngredient} | TRT: {product.requiresTrt ? 'sim' : 'nao'}</p>
                  <p className="mt-1 text-xs">{product.bulaSummary}</p>
                  <p className="mt-1 text-xs text-slate-500">Atividades: {product.allowedActivities.join(', ') || 'todas'}</p>
                </div>
              ))}
              {productRules.length === 0 && <p className="text-sm text-slate-500">Nenhum produto tecnico cadastrado.</p>}
            </div>
          </article>
        </section>
      )}
    </div>
  );
};

export default TechnicianDashboard;
