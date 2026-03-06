
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  CouncilType,
  TechnicianDemandStatus,
  TechnicianDocumentStatus,
  TechnicianDocumentType,
  TechnicianFieldReport,
  TechnicianPrescriptionDraft,
  TechnicianProducerDemand,
  TechnicianProducerFollowUp,
  TechnicianProductRule,
  TechnicianRuleUpdate,
  TechnicianTask,
  TechnicianTaskStatus,
  TechnicianTechnicalDocument,
  TechnicianVisitCheckpoint,
  TechnicianVisitPlan,
  TechnicianVisitStatus,
} from '../types';
import { immutableAuditService } from './immutableAuditService';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

export interface TechnicianKpi {
  id: string;
  label: string;
  value: string;
}

export interface TechnicianReportItem {
  id: string;
  title: string;
  location: string;
  dateLabel: string;
}

const kpiCollection = collection(db, 'technicianKpis');
const followUpCollection = collection(db, 'technicianProducerAssignments');
const demandCollection = collection(db, 'technicianProducerDemands');
const visitCollection = collection(db, 'technicianVisits');
const taskCollection = collection(db, 'technicianTasks');
const reportCollection = collection(db, 'technicianReports');
const documentCollection = collection(db, 'technicianDocuments');
const ruleUpdatesCollection = collection(db, 'technicianRuleUpdates');
const productRulesCollection = collection(db, 'technicalProducts');

const DEFAULT_CHECKPOINTS = [
  'Check-in na propriedade',
  'Inspecao visual',
  'Coleta de evidencias',
  'Orientacao ao produtor',
  'Check-out e assinatura',
];

const toIsoDate = (raw: unknown, fallback: string = new Date().toISOString()): string => {
  if (typeof raw === 'string' && raw.trim()) {
    return raw;
  }
  const asTimestamp = raw as { toDate?: () => Date } | undefined;
  if (asTimestamp && typeof asTimestamp.toDate === 'function') {
    return asTimestamp.toDate().toISOString();
  }
  return fallback;
};

const normalizeString = (raw: unknown, fallback = ''): string => String(raw ?? fallback).trim();

const toCheckpointArray = (raw: unknown): TechnicianVisitCheckpoint[] => {
  if (!Array.isArray(raw)) {
    return DEFAULT_CHECKPOINTS.map((label, index) => ({
      id: `checkpoint-${index + 1}`,
      label,
      done: false,
    }));
  }

  return raw
    .map((entry, index) => {
      const item = entry as Record<string, unknown>;
      const label = normalizeString(item.label, `Checkpoint ${index + 1}`);
      return {
        id: normalizeString(item.id, `checkpoint-${index + 1}`),
        label,
        done: Boolean(item.done),
        checkedAt: item.checkedAt ? toIsoDate(item.checkedAt) : undefined,
      };
    })
    .filter((item) => item.label.length > 0);
};

const toFollowUp = (id: string, raw: Record<string, unknown>): TechnicianProducerFollowUp => ({
  id,
  technicianUserId: normalizeString(raw.technicianUserId),
  producerId: normalizeString(raw.producerId),
  producerName: normalizeString(raw.producerName),
  producerDocument: raw.producerDocument ? normalizeString(raw.producerDocument) : undefined,
  propertyName: normalizeString(raw.propertyName, 'Propriedade nao informada'),
  region: normalizeString(raw.region, 'NACIONAL'),
  activity: normalizeString(raw.activity, 'Nao informado'),
  status: raw.status === 'PAUSADO' ? 'PAUSADO' : 'ATIVO',
  openDemands: Number(raw.openDemands ?? 0),
  lastVisitAt: raw.lastVisitAt ? toIsoDate(raw.lastVisitAt) : undefined,
});

const toDemand = (id: string, raw: Record<string, unknown>): TechnicianProducerDemand => ({
  id,
  technicianUserId: normalizeString(raw.technicianUserId),
  producerId: normalizeString(raw.producerId),
  producerName: normalizeString(raw.producerName),
  title: normalizeString(raw.title),
  description: normalizeString(raw.description),
  priority: raw.priority === 'ALTA' || raw.priority === 'BAIXA' ? raw.priority : 'MEDIA',
  status:
    raw.status === 'EM_ATENDIMENTO' || raw.status === 'CONCLUIDA'
      ? (raw.status as TechnicianDemandStatus)
      : 'ABERTA',
  createdAt: toIsoDate(raw.createdAt),
  dueDate: raw.dueDate ? toIsoDate(raw.dueDate) : undefined,
});

const toVisit = (id: string, raw: Record<string, unknown>): TechnicianVisitPlan => ({
  id,
  technicianUserId: normalizeString(raw.technicianUserId),
  producerId: normalizeString(raw.producerId),
  producerName: normalizeString(raw.producerName),
  scheduledAt: toIsoDate(raw.scheduledAt),
  status:
    raw.status === 'CONCLUIDA' || raw.status === 'NAO_REALIZADA'
      ? (raw.status as TechnicianVisitStatus)
      : 'AGENDADA',
  checkpoints: toCheckpointArray(raw.checkpoints),
  notes: raw.notes ? normalizeString(raw.notes) : undefined,
});

const toTask = (id: string, raw: Record<string, unknown>): TechnicianTask => ({
  id,
  technicianUserId: normalizeString(raw.technicianUserId),
  producerId: normalizeString(raw.producerId),
  producerName: normalizeString(raw.producerName),
  title: normalizeString(raw.title),
  description: raw.description ? normalizeString(raw.description) : undefined,
  dueDate: raw.dueDate ? toIsoDate(raw.dueDate) : undefined,
  status:
    raw.status === 'CONCLUIDA' || raw.status === 'ATRASADA' ? (raw.status as TechnicianTaskStatus) : 'PENDENTE',
});

const toFieldReport = (id: string, raw: Record<string, unknown>): TechnicianFieldReport => ({
  id,
  technicianUserId: normalizeString(raw.technicianUserId),
  producerId: normalizeString(raw.producerId),
  producerName: normalizeString(raw.producerName),
  title: normalizeString(raw.title),
  summary: normalizeString(raw.summary),
  imageUrls: Array.isArray(raw.imageUrls) ? raw.imageUrls.map((item) => normalizeString(item)).filter(Boolean) : [],
  evidenceReference: raw.evidenceReference ? normalizeString(raw.evidenceReference) : undefined,
  createdAt: toIsoDate(raw.createdAt),
  immutableAuditHash: raw.immutableAuditHash ? normalizeString(raw.immutableAuditHash) : undefined,
});

const toRuleUpdate = (id: string, raw: Record<string, unknown>): TechnicianRuleUpdate => ({
  id,
  region: normalizeString(raw.region, 'NACIONAL').toUpperCase(),
  title: normalizeString(raw.title),
  summary: normalizeString(raw.summary),
  sourceLabel: normalizeString(raw.sourceLabel, 'Normativo local'),
  sourceUrl: raw.sourceUrl ? normalizeString(raw.sourceUrl) : undefined,
  publishedAt: toIsoDate(raw.publishedAt),
});

const toProductRule = (id: string, raw: Record<string, unknown>): TechnicianProductRule => ({
  id,
  productName: normalizeString(raw.productName),
  activeIngredient: normalizeString(raw.activeIngredient),
  bulaSummary: normalizeString(raw.bulaSummary),
  allowedActivities: Array.isArray(raw.allowedActivities)
    ? raw.allowedActivities.map((item) => normalizeString(item)).filter(Boolean)
    : [],
  blockedRegions: Array.isArray(raw.blockedRegions)
    ? raw.blockedRegions.map((item) => normalizeString(item).toUpperCase()).filter(Boolean)
    : [],
  requiresTrt: Boolean(raw.requiresTrt),
  lastUpdatedAt: toIsoDate(raw.lastUpdatedAt),
});

const toTechnicalDocument = (id: string, raw: Record<string, unknown>): TechnicianTechnicalDocument => ({
  id,
  technicianUserId: normalizeString(raw.technicianUserId),
  producerId: normalizeString(raw.producerId),
  producerName: normalizeString(raw.producerName),
  region: normalizeString(raw.region),
  activity: normalizeString(raw.activity),
  category: normalizeString(raw.category),
  councilType: (raw.councilType as CouncilType) ?? 'CRMV',
  councilNumber: normalizeString(raw.councilNumber),
  documentType: (raw.documentType as TechnicianDocumentType) ?? 'LAUDO',
  status: (raw.status as TechnicianDocumentStatus) ?? 'RASCUNHO',
  diagnosis: normalizeString(raw.diagnosis),
  selectedProductIds: Array.isArray(raw.selectedProductIds)
    ? raw.selectedProductIds.map((item) => normalizeString(item)).filter(Boolean)
    : [],
  draftText: normalizeString(raw.draftText),
  warnings: Array.isArray(raw.warnings) ? raw.warnings.map((item) => normalizeString(item)).filter(Boolean) : [],
  evidenceReference: raw.evidenceReference ? normalizeString(raw.evidenceReference) : undefined,
  createdAt: toIsoDate(raw.createdAt),
  issuedAt: raw.issuedAt ? toIsoDate(raw.issuedAt) : undefined,
  immutableAuditHash: raw.immutableAuditHash ? normalizeString(raw.immutableAuditHash) : undefined,
});

const toKpi = (id: string, raw: Record<string, unknown>): TechnicianKpi => ({
  id,
  label: normalizeString(raw.label),
  value: normalizeString(raw.value),
});

const toReportItem = (report: TechnicianFieldReport): TechnicianReportItem => ({
  id: report.id,
  title: report.title,
  location: report.producerName,
  dateLabel: new Date(report.createdAt).toLocaleDateString('pt-BR'),
});

const sortByDateDesc = <T>(rows: T[], getDate: (item: T) => string): T[] => {
  return [...rows].sort((a, b) => getDate(b).localeCompare(getDate(a)));
};

const isOverdueDate = (dueDate?: string): boolean => {
  if (!dueDate) {
    return false;
  }
  return dueDate < new Date().toISOString();
};

const regionMatches = (ruleRegion: string, targetRegion?: string): boolean => {
  if (!targetRegion || !targetRegion.trim()) {
    return true;
  }

  const normalizedRuleRegion = ruleRegion.toUpperCase();
  const normalizedTarget = targetRegion.trim().toUpperCase();
  if (normalizedRuleRegion === 'NACIONAL') {
    return true;
  }

  if (normalizedRuleRegion === 'CENTRO-OESTE') {
    return ['MT', 'MS', 'GO', 'DF'].includes(normalizedTarget);
  }

  return normalizedRuleRegion === normalizedTarget;
};

const buildDraftFromRules = (params: {
  documentType: TechnicianDocumentType;
  producerName: string;
  region: string;
  activity: string;
  category: string;
  councilType: CouncilType;
  councilNumber: string;
  diagnosis: string;
  selectedProducts: TechnicianProductRule[];
  ruleUpdates: TechnicianRuleUpdate[];
}): TechnicianPrescriptionDraft => {
  const warnings: string[] = [];
  const normalizedRegion = params.region.trim().toUpperCase();
  const normalizedActivity = params.activity.trim().toUpperCase();

  if (!params.councilNumber.trim()) {
    warnings.push('Numero do conselho tecnico nao informado.');
  }

  if (params.selectedProducts.length === 0) {
    warnings.push('Nenhum produto selecionado para cruzamento de regras e bula.');
  }

  params.selectedProducts.forEach((product) => {
    const hasRegionBlock = product.blockedRegions.some((region) => region.trim().toUpperCase() === normalizedRegion);
    if (hasRegionBlock) {
      warnings.push(`Produto ${product.productName} bloqueado para a regiao ${normalizedRegion}.`);
    }

    const hasAllowedActivities = product.allowedActivities.length > 0;
    const isActivityAllowed = product.allowedActivities.some(
      (activity) => activity.trim().toUpperCase() === normalizedActivity
    );

    if (hasAllowedActivities && !isActivityAllowed) {
      warnings.push(`Produto ${product.productName} nao recomendado para atividade ${params.activity}.`);
    }

    if (product.requiresTrt && params.documentType === 'LAUDO') {
      warnings.push(`Produto ${product.productName} exige emissao de TRT/receituario.`);
    }
  });

  const docTitle =
    params.documentType === 'TRT'
      ? 'TERMO DE RESPONSABILIDADE TECNICA (TRT)'
      : params.documentType === 'RECEITUARIO'
        ? 'RECEITUARIO TECNICO'
        : 'LAUDO TECNICO';

  const productBlock =
    params.selectedProducts.length === 0
      ? 'Nenhum produto selecionado.'
      : params.selectedProducts
          .map(
            (product, index) =>
              `${index + 1}. ${product.productName} (${product.activeIngredient}) - ${product.bulaSummary}`
          )
          .join('\n');

  const updatesBlock =
    params.ruleUpdates.length === 0
      ? 'Sem atualizacoes regionais adicionais cadastradas.'
      : params.ruleUpdates
          .slice(0, 5)
          .map((rule, index) => `${index + 1}. ${rule.title} (${rule.region}) - ${rule.summary}`)
          .join('\n');

  const draftText = [
    docTitle,
    `Categoria/Foco tecnico: ${params.category}`,
    `Conselho: ${params.councilType} ${params.councilNumber || 'N/I'}`,
    `Produtor: ${params.producerName}`,
    `Atividade: ${params.activity}`,
    `Regiao: ${params.region}`,
    '',
    'Diagnostico tecnico:',
    params.diagnosis || 'Nao informado',
    '',
    'Produtos selecionados e orientacoes de bula:',
    productBlock,
    '',
    'Normativas regionais consideradas:',
    updatesBlock,
    '',
    'Checklist minimo para emissao:',
    '- Conferir dose, volume e intervalo de aplicacao.',
    '- Validar condicoes de seguranca e EPI obrigatorio.',
    '- Registrar lote do produto, data e evidencia digital.',
    '- Confirmar orientacao de descarte e periodo de carencia.',
  ].join('\n');

  return { draftText, warnings };
};

const fetchByTechnician = async (
  collectionRef: any,
  technicianUserId: string
) => {
  const context = await resolveTenantContext();
  const normalizedTechnicianId = technicianUserId.trim();
  const snapshot = !normalizedTechnicianId
    ? await getDocs(query(collectionRef, where('tenantId', '==', context.tenantId)))
    : await getDocs(
        query(
          collectionRef,
          where('tenantId', '==', context.tenantId),
          where('technicianUserId', '==', normalizedTechnicianId)
        )
      );

  return snapshot.docs.filter((docSnapshot: any) =>
    hasTenantAccess(docSnapshot.data() as Record<string, unknown>, context)
  );
};

export const technicianService = {
  async listKpis(technicianUserId: string = ''): Promise<TechnicianKpi[]> {
    const docs = await fetchByTechnician(kpiCollection, technicianUserId);
    const persisted = docs
      .map((docSnapshot: any) => toKpi(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .filter((item: TechnicianKpi) => item.label.length > 0);

    if (persisted.length > 0) {
      return persisted;
    }

    const [followUps, demands, visits, tasks] = await Promise.all([
      this.listProducerFollowUps(technicianUserId),
      this.listDemands(technicianUserId),
      this.listVisits(technicianUserId),
      this.listTasks(technicianUserId),
    ]);

    const doneVisits = visits.filter((visit) => visit.status === 'CONCLUIDA').length;
    const doneTasks = tasks.filter((task) => task.status === 'CONCLUIDA').length;

    return [
      { id: 'kpi-producers', label: 'Produtores acompanhados', value: String(followUps.length) },
      {
        id: 'kpi-demands',
        label: 'Demandas abertas',
        value: String(demands.filter((item: TechnicianProducerDemand) => item.status !== 'CONCLUIDA').length),
      },
      { id: 'kpi-visits', label: 'Visitas concluidas', value: String(doneVisits) },
      { id: 'kpi-tasks', label: 'Tarefas concluidas', value: String(doneTasks) },
    ];
  },

  async listReports(technicianUserId: string = ''): Promise<TechnicianReportItem[]> {
    const reports = await this.listFieldReports(technicianUserId);
    return reports.slice(0, 20).map(toReportItem);
  },

  async listProducerFollowUps(technicianUserId: string): Promise<TechnicianProducerFollowUp[]> {
    const docs = await fetchByTechnician(followUpCollection, technicianUserId);
    return docs
      .map((docSnapshot: any) => toFollowUp(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: TechnicianProducerFollowUp, b: TechnicianProducerFollowUp) => a.producerName.localeCompare(b.producerName));
  },

  async listDemands(technicianUserId: string, producerId?: string): Promise<TechnicianProducerDemand[]> {
    const docs = await fetchByTechnician(demandCollection, technicianUserId);
    const rows = docs.map((docSnapshot: any) => toDemand(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
    const filtered = producerId ? rows.filter((item: TechnicianProducerDemand) => item.producerId === producerId) : rows;
    return sortByDateDesc(filtered, (item) => item.createdAt);
  },

  async listVisits(technicianUserId: string, producerId?: string): Promise<TechnicianVisitPlan[]> {
    const docs = await fetchByTechnician(visitCollection, technicianUserId);
    const rows = docs.map((docSnapshot: any) => toVisit(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
    const filtered = producerId ? rows.filter((item: TechnicianVisitPlan) => item.producerId === producerId) : rows;
    return sortByDateDesc(filtered, (item) => item.scheduledAt);
  },

  async listTasks(technicianUserId: string, producerId?: string): Promise<TechnicianTask[]> {
    const docs = await fetchByTechnician(taskCollection, technicianUserId);
    const rows = docs.map((docSnapshot: any) => toTask(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
    const filtered = producerId ? rows.filter((item: TechnicianTask) => item.producerId === producerId) : rows;

    return filtered
      .map((task: TechnicianTask): TechnicianTask => {
        if (task.status === 'CONCLUIDA') {
          return task;
        }
        if (isOverdueDate(task.dueDate)) {
          const nextStatus: TechnicianTaskStatus = 'ATRASADA';
          return { ...task, status: nextStatus };
        }
        return task;
      })
      .sort((a: TechnicianTask, b: TechnicianTask) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  },

  async listFieldReports(technicianUserId: string, producerId?: string): Promise<TechnicianFieldReport[]> {
    const docs = await fetchByTechnician(reportCollection, technicianUserId);
    const rows = docs.map((docSnapshot: any) =>
      toFieldReport(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
    const filtered = producerId ? rows.filter((item: TechnicianFieldReport) => item.producerId === producerId) : rows;
    return sortByDateDesc(filtered, (item) => item.createdAt);
  },

  async listDocuments(technicianUserId: string, producerId?: string): Promise<TechnicianTechnicalDocument[]> {
    const docs = await fetchByTechnician(documentCollection, technicianUserId);
    const rows = docs.map((docSnapshot: any) =>
      toTechnicalDocument(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
    const filtered = producerId ? rows.filter((item: TechnicianTechnicalDocument) => item.producerId === producerId) : rows;
    return sortByDateDesc(filtered, (item) => item.createdAt);
  },

  async listRuleUpdates(region?: string): Promise<TechnicianRuleUpdate[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(ruleUpdatesCollection);
    const rows = snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        const visibility = normalizeString(raw.visibility).toUpperCase();
        const isPublic = visibility === 'PUBLIC' || visibility === 'OPEN_MARKET';
        return { raw, rule: toRuleUpdate(docSnapshot.id, raw), isPublic };
      })
      .filter((entry: { raw: Record<string, unknown>; isPublic: boolean }) =>
        hasTenantAccess(entry.raw, context) || entry.isPublic
      )
      .map((entry: { rule: TechnicianRuleUpdate }) => entry.rule);
    return rows.filter((item: TechnicianRuleUpdate) => regionMatches(item.region, region));
  },

  async listProductRules(activity?: string): Promise<TechnicianProductRule[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(productRulesCollection);
    const sourceRows = snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        const visibility = normalizeString(raw.visibility).toUpperCase();
        const isPublic = visibility === 'PUBLIC' || visibility === 'OPEN_MARKET';
        return { raw, productRule: toProductRule(docSnapshot.id, raw), isPublic };
      })
      .filter((entry: { raw: Record<string, unknown>; isPublic: boolean }) =>
        hasTenantAccess(entry.raw, context) || entry.isPublic
      )
      .map((entry: { productRule: TechnicianProductRule }) => entry.productRule);
    if (!activity || !activity.trim()) {
      return sourceRows;
    }

    const normalizedActivity = activity.trim().toUpperCase();
    return sourceRows.filter(
      (item: TechnicianProductRule) =>
        item.allowedActivities.length === 0 ||
        item.allowedActivities.some((entry: string) => entry.toUpperCase() === normalizedActivity)
    );
  },
  async createFieldReport(params: {
    technicianUserId: string;
    actor: string;
    producerId: string;
    producerName: string;
    title: string;
    summary: string;
    imageUrls: string[];
    evidenceReference?: string;
  }): Promise<TechnicianFieldReport> {
    if (!params.technicianUserId.trim() || !params.producerId.trim()) {
      throw new Error('Produtor e tecnico devem ser informados para registrar o relatorio.');
    }
    if (!params.title.trim() || !params.summary.trim()) {
      throw new Error('Informe titulo e resumo para registrar o relatorio.');
    }

    const nowIso = new Date().toISOString();
    const cleanedImages = params.imageUrls.map((item) => item.trim()).filter(Boolean);
    const context = await resolveTenantContext();

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'TECH_FIELD_REPORT_CREATED',
      details: `Relatorio tecnico registrado para ${params.producerName}.`,
      proofUrl: params.evidenceReference,
      metadata: {
        producerId: params.producerId,
        images: cleanedImages.length,
      },
    });

    const created = await addDoc(
      reportCollection,
      withTenantFields(
        {
          technicianUserId: params.technicianUserId,
          producerId: params.producerId,
          producerName: params.producerName,
          title: params.title.trim(),
          summary: params.summary.trim(),
          imageUrls: cleanedImages,
          evidenceReference: params.evidenceReference?.trim() || null,
          createdAt: nowIso,
          immutableAuditHash: audit.hash,
          immutable: true,
          createdAtServer: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      )
    );

    return {
      id: created.id,
      technicianUserId: params.technicianUserId,
      producerId: params.producerId,
      producerName: params.producerName,
      title: params.title.trim(),
      summary: params.summary.trim(),
      imageUrls: cleanedImages,
      evidenceReference: params.evidenceReference?.trim() || undefined,
      createdAt: nowIso,
      immutableAuditHash: audit.hash,
    };
  },

  async scheduleVisit(params: {
    technicianUserId: string;
    actor: string;
    producerId: string;
    producerName: string;
    scheduledAt: string;
    notes?: string;
  }): Promise<TechnicianVisitPlan> {
    if (!params.technicianUserId.trim() || !params.producerId.trim() || !params.scheduledAt.trim()) {
      throw new Error('Informe produtor e data da visita para agendar.');
    }

    const checkpoints = DEFAULT_CHECKPOINTS.map((label, index) => ({
      id: `checkpoint-${index + 1}`,
      label,
      done: false,
    }));
    const context = await resolveTenantContext();

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'TECH_VISIT_SCHEDULED',
      details: `Visita agendada para ${params.producerName} em ${params.scheduledAt}.`,
      metadata: { producerId: params.producerId },
    });

    const created = await addDoc(
      visitCollection,
      withTenantFields(
        {
          technicianUserId: params.technicianUserId,
          producerId: params.producerId,
          producerName: params.producerName,
          scheduledAt: params.scheduledAt,
          status: 'AGENDADA',
          checkpoints,
          notes: params.notes?.trim() || null,
          immutableAuditHash: audit.hash,
          immutable: true,
          createdAtServer: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      )
    );

    return {
      id: created.id,
      technicianUserId: params.technicianUserId,
      producerId: params.producerId,
      producerName: params.producerName,
      scheduledAt: params.scheduledAt,
      status: 'AGENDADA',
      checkpoints,
      notes: params.notes?.trim() || undefined,
    };
  },

  async updateVisitCheckpoint(params: {
    visitId: string;
    checkpointId: string;
    done: boolean;
    actor: string;
  }): Promise<TechnicianVisitPlan> {
    if (!params.visitId.trim() || !params.checkpointId.trim()) {
      throw new Error('Visita e checkpoint sao obrigatorios.');
    }

    const visitRef = doc(db, 'technicianVisits', params.visitId);
    const snapshot = await getDoc(visitRef);
    if (!snapshot.exists()) {
      throw new Error('Visita nao encontrada.');
    }
    const context = await resolveTenantContext();
    if (!hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para atualizar visita de outro tenant.');
    }

    const current = toVisit(snapshot.id, snapshot.data() as Record<string, unknown>);
    const nowIso = new Date().toISOString();
    const checkpoints = current.checkpoints.map((checkpoint) =>
      checkpoint.id === params.checkpointId
        ? {
            ...checkpoint,
            done: params.done,
            checkedAt: params.done ? nowIso : undefined,
          }
        : checkpoint
    );

    const allDone = checkpoints.every((checkpoint) => checkpoint.done);
    const status: TechnicianVisitStatus = allDone ? 'CONCLUIDA' : current.status === 'NAO_REALIZADA' ? 'NAO_REALIZADA' : 'AGENDADA';

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'TECH_VISIT_CHECKPOINT_UPDATED',
      details: `Checkpoint ${params.checkpointId} atualizado na visita ${params.visitId}.`,
      metadata: {
        visitId: params.visitId,
        checkpointId: params.checkpointId,
        done: params.done,
      },
    });

    await setDoc(
      visitRef,
      withTenantFields(
        {
          checkpoints,
          status,
          immutableAuditHash: audit.hash,
          immutable: true,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return {
      ...current,
      checkpoints,
      status,
    };
  },

  async createTask(params: {
    technicianUserId: string;
    actor: string;
    producerId: string;
    producerName: string;
    title: string;
    description?: string;
    dueDate?: string;
  }): Promise<TechnicianTask> {
    if (!params.technicianUserId.trim() || !params.producerId.trim() || !params.title.trim()) {
      throw new Error('Produtor e titulo da tarefa sao obrigatorios.');
    }

    const status: TechnicianTaskStatus = isOverdueDate(params.dueDate) ? 'ATRASADA' : 'PENDENTE';
    const context = await resolveTenantContext();

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'TECH_TASK_CREATED',
      details: `Tarefa criada para ${params.producerName}: ${params.title}.`,
      metadata: {
        producerId: params.producerId,
        dueDate: params.dueDate ?? null,
      },
    });

    const created = await addDoc(
      taskCollection,
      withTenantFields(
        {
          technicianUserId: params.technicianUserId,
          producerId: params.producerId,
          producerName: params.producerName,
          title: params.title.trim(),
          description: params.description?.trim() || null,
          dueDate: params.dueDate || null,
          status,
          immutableAuditHash: audit.hash,
          immutable: true,
          createdAtServer: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      )
    );

    return {
      id: created.id,
      technicianUserId: params.technicianUserId,
      producerId: params.producerId,
      producerName: params.producerName,
      title: params.title.trim(),
      description: params.description?.trim() || undefined,
      dueDate: params.dueDate,
      status,
    };
  },

  async setTaskStatus(params: {
    taskId: string;
    status: TechnicianTaskStatus;
    actor: string;
  }): Promise<TechnicianTask> {
    if (!params.taskId.trim()) {
      throw new Error('Tarefa invalida.');
    }

    const taskRef = doc(db, 'technicianTasks', params.taskId);
    const snapshot = await getDoc(taskRef);
    if (!snapshot.exists()) {
      throw new Error('Tarefa nao encontrada.');
    }
    const context = await resolveTenantContext();
    if (!hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para atualizar tarefa de outro tenant.');
    }

    const current = toTask(snapshot.id, snapshot.data() as Record<string, unknown>);

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'TECH_TASK_STATUS_UPDATED',
      details: `Status da tarefa ${params.taskId} alterado para ${params.status}.`,
      metadata: {
        taskId: params.taskId,
        status: params.status,
      },
    });

    await setDoc(
      taskRef,
      withTenantFields(
        {
          status: params.status,
          immutableAuditHash: audit.hash,
          immutable: true,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return {
      ...current,
      status: params.status,
    };
  },
  async buildPrescriptionDraft(params: {
    documentType: TechnicianDocumentType;
    producerName: string;
    region: string;
    activity: string;
    category: string;
    councilType: CouncilType;
    councilNumber: string;
    diagnosis: string;
    selectedProductIds: string[];
  }): Promise<TechnicianPrescriptionDraft> {
    const [productRules, updates] = await Promise.all([
      this.listProductRules(params.activity),
      this.listRuleUpdates(params.region),
    ]);

    const selectedSet = new Set(params.selectedProductIds.map((item) => item.trim()));
    const selectedProducts = productRules.filter((item) => selectedSet.has(item.id));

    return buildDraftFromRules({
      ...params,
      selectedProducts,
      ruleUpdates: updates,
    });
  },

  async issueTechnicalDocument(params: {
    technicianUserId: string;
    actor: string;
    producerId: string;
    producerName: string;
    region: string;
    activity: string;
    category: string;
    councilType: CouncilType;
    councilNumber: string;
    documentType: TechnicianDocumentType;
    diagnosis: string;
    selectedProductIds: string[];
    evidenceReference?: string;
  }): Promise<TechnicianTechnicalDocument> {
    if (!params.technicianUserId.trim() || !params.producerId.trim()) {
      throw new Error('Produtor e tecnico sao obrigatorios para emissao.');
    }
    if (!params.diagnosis.trim()) {
      throw new Error('Informe o diagnostico tecnico para emitir o documento.');
    }

    const draft = await this.buildPrescriptionDraft({
      documentType: params.documentType,
      producerName: params.producerName,
      region: params.region,
      activity: params.activity,
      category: params.category,
      councilType: params.councilType,
      councilNumber: params.councilNumber,
      diagnosis: params.diagnosis,
      selectedProductIds: params.selectedProductIds,
    });

    const nowIso = new Date().toISOString();
    const context = await resolveTenantContext();

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: `TECH_${params.documentType}_ISSUED`,
      details: `${params.documentType} emitido para ${params.producerName}.`,
      proofUrl: params.evidenceReference,
      metadata: {
        producerId: params.producerId,
        documentType: params.documentType,
        warnings: draft.warnings,
      },
    });

    const created = await addDoc(
      documentCollection,
      withTenantFields(
        {
          technicianUserId: params.technicianUserId,
          producerId: params.producerId,
          producerName: params.producerName,
          region: params.region,
          activity: params.activity,
          category: params.category,
          councilType: params.councilType,
          councilNumber: params.councilNumber,
          documentType: params.documentType,
          status: 'EMITIDO',
          diagnosis: params.diagnosis,
          selectedProductIds: params.selectedProductIds,
          draftText: draft.draftText,
          warnings: draft.warnings,
          evidenceReference: params.evidenceReference?.trim() || null,
          createdAt: nowIso,
          issuedAt: nowIso,
          immutableAuditHash: audit.hash,
          immutable: true,
          createdAtServer: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      )
    );

    return {
      id: created.id,
      technicianUserId: params.technicianUserId,
      producerId: params.producerId,
      producerName: params.producerName,
      region: params.region,
      activity: params.activity,
      category: params.category,
      councilType: params.councilType,
      councilNumber: params.councilNumber,
      documentType: params.documentType,
      status: 'EMITIDO',
      diagnosis: params.diagnosis,
      selectedProductIds: params.selectedProductIds,
      draftText: draft.draftText,
      warnings: draft.warnings,
      evidenceReference: params.evidenceReference?.trim() || undefined,
      createdAt: nowIso,
      issuedAt: nowIso,
      immutableAuditHash: audit.hash,
    };
  },
};
