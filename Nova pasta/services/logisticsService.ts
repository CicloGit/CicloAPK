import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  LogisticsEntry,
  LogisticsEvidence,
  LogisticsEvidenceType,
  LogisticsHaulProfile,
  LogisticsStatus,
  LogisticsTransportMode,
} from '../types';
import { immutableAuditService } from './immutableAuditService';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const logisticsCollection = collection(db, 'logisticsEntries');
const nowIso = () => new Date().toISOString();
export const SHORT_DISTANCE_ELECTRIC_LIMIT_KM = 180;

const normalizeStatus = (value: unknown): LogisticsStatus => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (
    normalized === 'SOLICITADO' ||
    normalized === 'ACEITO' ||
    normalized === 'CARREGAMENTO_AUTORIZADO' ||
    normalized === 'EM_TRANSITO' ||
    normalized === 'AGUARDANDO_DESCARGA' ||
    normalized === 'DESCARGA_AUTORIZADA' ||
    normalized === 'FINALIZADO' ||
    normalized === 'CANCELADO'
  ) {
    return normalized as LogisticsStatus;
  }
  return 'SOLICITADO';
};

const normalizeEvidenceType = (value: unknown): LogisticsEvidenceType => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (
    normalized === 'QR' ||
    normalized === 'PHOTO' ||
    normalized === 'VIDEO' ||
    normalized === 'WEIGHT_QR' ||
    normalized === 'SALE_AUTHORIZATION'
  ) {
    return normalized as LogisticsEvidenceType;
  }
  return 'QR';
};

const normalizeType = (value: unknown): LogisticsEntry['type'] => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized.includes('coleta')) {
    return 'Coleta';
  }
  if (normalized.includes('transfer')) {
    return 'Transferencia';
  }
  return 'Entrega';
};

const normalizeDistanceKm = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Number(parsed.toFixed(1));
};

const normalizeTransportMode = (value: unknown): LogisticsTransportMode | undefined => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'ELETRICO' || normalized === 'COMBUSTAO' || normalized === 'FERROVIA') {
    return normalized as LogisticsTransportMode;
  }
  return undefined;
};

const normalizeHaulProfile = (
  value: unknown,
  distanceKm: number | undefined
): LogisticsHaulProfile | undefined => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'CURTA_DISTANCIA' || normalized === 'LONGA_DISTANCIA') {
    return normalized as LogisticsHaulProfile;
  }
  if (typeof distanceKm !== 'number') {
    return undefined;
  }
  return distanceKm <= SHORT_DISTANCE_ELECTRIC_LIMIT_KM ? 'CURTA_DISTANCIA' : 'LONGA_DISTANCIA';
};

const transportModeLabel = (mode: LogisticsTransportMode): string => {
  if (mode === 'ELETRICO') {
    return 'veiculo eletrico';
  }
  if (mode === 'FERROVIA') {
    return 'ferrovia';
  }
  return 'veiculo a combustao';
};

export interface LogisticsTransportRecommendation {
  distanceKm: number;
  haulProfile: LogisticsHaulProfile;
  recommendedMode: LogisticsTransportMode;
  allowedModes: LogisticsTransportMode[];
  reason: string;
}

export const recommendTransportMode = (
  distanceKm: number,
  railAvailable: boolean
): LogisticsTransportRecommendation => {
  const normalizedDistance = normalizeDistanceKm(distanceKm);
  if (typeof normalizedDistance !== 'number') {
    throw new Error('Distancia invalida para aplicar politica de transporte.');
  }

  if (normalizedDistance <= SHORT_DISTANCE_ELECTRIC_LIMIT_KM) {
    return {
      distanceKm: normalizedDistance,
      haulProfile: 'CURTA_DISTANCIA',
      recommendedMode: 'ELETRICO',
      allowedModes: ['ELETRICO'],
      reason: `Distancia ate ${SHORT_DISTANCE_ELECTRIC_LIMIT_KM} km deve priorizar veiculo eletrico.`,
    };
  }

  if (railAvailable) {
    return {
      distanceKm: normalizedDistance,
      haulProfile: 'LONGA_DISTANCIA',
      recommendedMode: 'FERROVIA',
      allowedModes: ['FERROVIA', 'COMBUSTAO'],
      reason: 'Distancia longa: priorizar ferrovia quando disponivel, com combustao como contingencia.',
    };
  }

  return {
    distanceKm: normalizedDistance,
    haulProfile: 'LONGA_DISTANCIA',
    recommendedMode: 'COMBUSTAO',
    allowedModes: ['COMBUSTAO'],
    reason: 'Distancia longa sem malha ferroviaria disponivel: usar veiculo a combustao.',
  };
};

const toEvidence = (raw: unknown): LogisticsEvidence => {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    id: String(value.id ?? `EVD-${Date.now()}`),
    type: normalizeEvidenceType(value.type),
    reference: String(value.reference ?? ''),
    actor: String(value.actor ?? ''),
    createdAt: String(value.createdAt ?? nowIso()),
  };
};

const toLogisticsEntry = (id: string, raw: Record<string, unknown>): LogisticsEntry => {
  const distanceKm = normalizeDistanceKm(raw.distanceKm);
  const railAvailable = raw.railAvailable === true;
  const recommendation =
    typeof distanceKm === 'number' ? recommendTransportMode(distanceKm, railAvailable) : undefined;
  const recommendedTransportMode =
    normalizeTransportMode(raw.recommendedTransportMode) ?? recommendation?.recommendedMode;
  const selectedTransportMode = normalizeTransportMode(raw.selectedTransportMode);

  return {
    id,
    tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
    requestorUserId: raw.requestorUserId ? String(raw.requestorUserId) : undefined,
    requestorName: raw.requestorName ? String(raw.requestorName) : undefined,
    carrierUserId: raw.carrierUserId ? String(raw.carrierUserId) : undefined,
    carrierName: raw.carrierName ? String(raw.carrierName) : undefined,
    type: normalizeType(raw.type),
    description: String(raw.description ?? ''),
    origin: String(raw.origin ?? ''),
    destination: String(raw.destination ?? ''),
    date: String(raw.date ?? nowIso()),
    distanceKm,
    haulProfile: normalizeHaulProfile(raw.haulProfile, distanceKm) ?? recommendation?.haulProfile,
    railAvailable,
    recommendedTransportMode,
    selectedTransportMode,
    transportPolicyReason: raw.transportPolicyReason
      ? String(raw.transportPolicyReason)
      : recommendation?.reason,
    status: normalizeStatus(raw.status),
    driver: raw.driver ? String(raw.driver) : undefined,
    plate: raw.plate ? String(raw.plate) : undefined,
    currentLocation: raw.currentLocation ? String(raw.currentLocation) : undefined,
    trackingCode: raw.trackingCode ? String(raw.trackingCode) : undefined,
    loadAuthorizedAt: raw.loadAuthorizedAt ? String(raw.loadAuthorizedAt) : undefined,
    unloadAuthorizedAt: raw.unloadAuthorizedAt ? String(raw.unloadAuthorizedAt) : undefined,
    loadAuthorizedBy: raw.loadAuthorizedBy ? String(raw.loadAuthorizedBy) : undefined,
    unloadAuthorizedBy: raw.unloadAuthorizedBy ? String(raw.unloadAuthorizedBy) : undefined,
    immutableAuditHash: raw.immutableAuditHash ? String(raw.immutableAuditHash) : undefined,
    evidences: Array.isArray(raw.evidences) ? raw.evidences.map((item) => toEvidence(item)) : [],
    openForMarketplace: raw.openForMarketplace === true,
  };
};

const hasCarrierAccess = (raw: Record<string, unknown>, userId: string): boolean =>
  String(raw.carrierUserId ?? '').trim() === userId;

const canReadEntry = (raw: Record<string, unknown>, userId: string, tenantId: string): boolean => {
  if (hasTenantAccess(raw, { userId, tenantId })) {
    return true;
  }
  if (hasCarrierAccess(raw, userId)) {
    return true;
  }
  return raw.openForMarketplace === true && normalizeStatus(raw.status) === 'SOLICITADO';
};

const appendEvidence = (
  entry: LogisticsEntry,
  params: { type: LogisticsEvidenceType; reference: string; actor: string }
): LogisticsEvidence[] => [
  ...entry.evidences,
  {
    id: `EVD-${Date.now()}`,
    type: params.type,
    reference: params.reference.trim(),
    actor: params.actor,
    createdAt: nowIso(),
  },
];

const requireEvidenceReference = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('Informe evidencia digital para esta etapa logistica.');
  }
  return normalized;
};

const fetchEntryForUpdate = async (entryId: string) => {
  const context = await resolveTenantContext();
  const ref = doc(db, 'logisticsEntries', entryId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    throw new Error('Solicitacao logistica nao encontrada.');
  }

  const raw = snapshot.data() as Record<string, unknown>;
  const allowed = canReadEntry(raw, context.userId, context.tenantId);
  if (!allowed) {
    throw new Error('Sem permissao para alterar esta solicitacao.');
  }

  return {
    context,
    ref,
    raw,
    entry: toLogisticsEntry(snapshot.id, raw),
  };
};

export const logisticsService = {
  async listEntries(): Promise<LogisticsEntry[]> {
    const context = await resolveTenantContext();
    const [tenantSnapshot, carrierSnapshot, marketplaceSnapshot] = await Promise.all([
      getDocs(query(logisticsCollection, where('tenantId', '==', context.tenantId))),
      getDocs(query(logisticsCollection, where('carrierUserId', '==', context.userId))),
      getDocs(query(logisticsCollection, where('openForMarketplace', '==', true), where('status', '==', 'SOLICITADO'))),
    ]);

    const dedupedRows = new Map<string, { raw: Record<string, unknown>; entry: LogisticsEntry }>();
    [tenantSnapshot, carrierSnapshot, marketplaceSnapshot].forEach((snapshot) => {
      snapshot.docs.forEach((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        dedupedRows.set(docSnapshot.id, {
          raw,
          entry: toLogisticsEntry(docSnapshot.id, raw),
        });
      });
    });

    return Array.from(dedupedRows.values())
      .filter((row: { raw: Record<string, unknown> }) => canReadEntry(row.raw, context.userId, context.tenantId))
      .map((row: { entry: LogisticsEntry }) => row.entry)
      .sort((a: LogisticsEntry, b: LogisticsEntry) => b.date.localeCompare(a.date));
  },

  async createRequest(params: {
    actor: string;
    type: LogisticsEntry['type'];
    description: string;
    origin: string;
    destination: string;
    distanceKm: number;
    railAvailable?: boolean;
    openForMarketplace?: boolean;
    evidenceReference?: string;
  }): Promise<LogisticsEntry> {
    if (!params.description.trim() || !params.origin.trim() || !params.destination.trim()) {
      throw new Error('Preencha descricao, origem e destino da solicitacao logistica.');
    }
    const distanceKm = normalizeDistanceKm(params.distanceKm);
    if (typeof distanceKm !== 'number') {
      throw new Error('Informe uma distancia valida em km para a solicitacao.');
    }
    const railAvailable = params.railAvailable === true;
    const recommendation = recommendTransportMode(distanceKm, railAvailable);

    const context = await resolveTenantContext();
    const createdAt = nowIso();
    const evidenceRef = params.evidenceReference?.trim() ?? '';
    const evidences: LogisticsEvidence[] = evidenceRef
      ? [
          {
            id: `EVD-${Date.now()}`,
            type: 'SALE_AUTHORIZATION',
            reference: evidenceRef,
            actor: params.actor,
            createdAt,
          },
        ]
      : [];

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'LOGISTICS_REQUEST_CREATED',
      details: `Solicitacao logistica criada: ${params.origin} -> ${params.destination}.`,
      proofUrl: evidenceRef || undefined,
      metadata: {
        origin: params.origin,
        destination: params.destination,
        distanceKm,
        haulProfile: recommendation.haulProfile,
        recommendedTransportMode: recommendation.recommendedMode,
        railAvailable,
        openForMarketplace: params.openForMarketplace !== false,
      },
    });

    const entry: LogisticsEntry = {
      id: `LOG-${Date.now()}`,
      tenantId: context.tenantId,
      requestorUserId: context.userId,
      requestorName: params.actor,
      type: params.type,
      description: params.description.trim(),
      origin: params.origin.trim(),
      destination: params.destination.trim(),
      date: createdAt,
      distanceKm,
      haulProfile: recommendation.haulProfile,
      railAvailable,
      recommendedTransportMode: recommendation.recommendedMode,
      selectedTransportMode: recommendation.recommendedMode,
      transportPolicyReason: recommendation.reason,
      status: 'SOLICITADO',
      trackingCode: `TRK-${Date.now().toString().slice(-8)}`,
      immutableAuditHash: audit.hash,
      evidences,
      openForMarketplace: params.openForMarketplace !== false,
    };

    await setDoc(
      doc(db, 'logisticsEntries', entry.id),
      withTenantFields(
        {
          ...entry,
          immutable: true,
          createdAt: createdAt,
          createdAtTs: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return entry;
  },

  async acceptRequest(params: {
    entryId: string;
    actor: string;
    carrierName: string;
    driver: string;
    plate: string;
    evidenceReference: string;
    selectedTransportMode?: LogisticsTransportMode;
  }): Promise<LogisticsEntry> {
    const evidenceReference = requireEvidenceReference(params.evidenceReference);
    const { context, ref, entry } = await fetchEntryForUpdate(params.entryId);
    if (entry.status !== 'SOLICITADO') {
      throw new Error('Apenas solicitacoes em aberto podem ser aceitas.');
    }
    const recommendation =
      typeof entry.distanceKm === 'number'
        ? recommendTransportMode(entry.distanceKm, entry.railAvailable === true)
        : undefined;
    const selectedTransportMode =
      normalizeTransportMode(params.selectedTransportMode) ??
      entry.selectedTransportMode ??
      recommendation?.recommendedMode ??
      'COMBUSTAO';

    if (recommendation && !recommendation.allowedModes.includes(selectedTransportMode)) {
      const allowedModesLabel = recommendation.allowedModes.map((mode) => transportModeLabel(mode)).join(' ou ');
      throw new Error(
        `Para ${recommendation.distanceKm} km, use ${allowedModesLabel}. Modal selecionado: ${transportModeLabel(selectedTransportMode)}.`
      );
    }

    const evidences = appendEvidence(entry, {
      type: 'QR',
      reference: evidenceReference,
      actor: params.actor,
    });

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'LOGISTICS_REQUEST_ACCEPTED',
      details: `Solicitacao ${entry.id} aceita para transporte.`,
      proofUrl: evidenceReference,
      metadata: {
        entryId: entry.id,
        driver: params.driver,
        plate: params.plate,
        selectedTransportMode,
        recommendedTransportMode: recommendation?.recommendedMode ?? entry.recommendedTransportMode ?? null,
      },
    });

    const nextFields: Record<string, unknown> = {
      carrierUserId: context.userId,
      carrierName: params.carrierName.trim() || params.actor,
      driver: params.driver.trim(),
      plate: params.plate.trim(),
      selectedTransportMode,
      status: 'ACEITO',
      evidences,
      immutableAuditHash: audit.hash,
      immutable: true,
      updatedAt: serverTimestamp(),
    };
    if (typeof entry.distanceKm === 'number') {
      nextFields.distanceKm = entry.distanceKm;
    }
    if (entry.railAvailable !== undefined) {
      nextFields.railAvailable = entry.railAvailable;
    }
    if (recommendation) {
      nextFields.haulProfile = recommendation.haulProfile;
      nextFields.recommendedTransportMode = recommendation.recommendedMode;
      nextFields.transportPolicyReason = recommendation.reason;
    }

    await updateDoc(ref, nextFields);

    return {
      ...entry,
      carrierUserId: context.userId,
      carrierName: params.carrierName.trim() || params.actor,
      driver: params.driver.trim(),
      plate: params.plate.trim(),
      selectedTransportMode,
      haulProfile: recommendation?.haulProfile ?? entry.haulProfile,
      recommendedTransportMode: recommendation?.recommendedMode ?? entry.recommendedTransportMode,
      transportPolicyReason: recommendation?.reason ?? entry.transportPolicyReason,
      status: 'ACEITO',
      evidences,
      immutableAuditHash: audit.hash,
    };
  },

  async authorizeLoading(params: {
    entryId: string;
    actor: string;
    evidenceReference: string;
  }): Promise<LogisticsEntry> {
    const evidenceReference = requireEvidenceReference(params.evidenceReference);
    const { ref, entry } = await fetchEntryForUpdate(params.entryId);
    if (entry.status !== 'ACEITO') {
      throw new Error('Somente solicitacoes aceitas podem ser autorizadas para carregamento.');
    }

    const evidences = appendEvidence(entry, {
      type: 'SALE_AUTHORIZATION',
      reference: evidenceReference,
      actor: params.actor,
    });
    const loadAuthorizedAt = nowIso();

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'LOGISTICS_LOADING_AUTHORIZED',
      details: `Carregamento autorizado para ${entry.id}.`,
      proofUrl: evidenceReference,
      metadata: { entryId: entry.id },
    });

    await updateDoc(ref, {
      status: 'CARREGAMENTO_AUTORIZADO',
      loadAuthorizedBy: params.actor,
      loadAuthorizedAt,
      evidences,
      immutableAuditHash: audit.hash,
      immutable: true,
      updatedAt: serverTimestamp(),
    });

    return {
      ...entry,
      status: 'CARREGAMENTO_AUTORIZADO',
      loadAuthorizedBy: params.actor,
      loadAuthorizedAt,
      evidences,
      immutableAuditHash: audit.hash,
    };
  },

  async startTransit(params: {
    entryId: string;
    actor: string;
    currentLocation: string;
    evidenceReference: string;
  }): Promise<LogisticsEntry> {
    const evidenceReference = requireEvidenceReference(params.evidenceReference);
    const { ref, entry } = await fetchEntryForUpdate(params.entryId);
    if (entry.status !== 'CARREGAMENTO_AUTORIZADO') {
      throw new Error('Para iniciar transito, a solicitacao precisa de carregamento autorizado.');
    }

    const evidences = appendEvidence(entry, {
      type: 'WEIGHT_QR',
      reference: evidenceReference,
      actor: params.actor,
    });

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'LOGISTICS_TRANSIT_STARTED',
      details: `Transporte ${entry.id} iniciado.`,
      proofUrl: evidenceReference,
      metadata: {
        entryId: entry.id,
        location: params.currentLocation,
      },
    });

    await updateDoc(ref, {
      status: 'EM_TRANSITO',
      currentLocation: params.currentLocation.trim(),
      evidences,
      immutableAuditHash: audit.hash,
      immutable: true,
      updatedAt: serverTimestamp(),
    });

    return {
      ...entry,
      status: 'EM_TRANSITO',
      currentLocation: params.currentLocation.trim(),
      evidences,
      immutableAuditHash: audit.hash,
    };
  },

  async requestUnloading(params: {
    entryId: string;
    actor: string;
    currentLocation: string;
    evidenceReference: string;
  }): Promise<LogisticsEntry> {
    const evidenceReference = requireEvidenceReference(params.evidenceReference);
    const { ref, entry } = await fetchEntryForUpdate(params.entryId);
    if (entry.status !== 'EM_TRANSITO') {
      throw new Error('Somente transporte em transito pode solicitar descarga.');
    }

    const evidences = appendEvidence(entry, {
      type: 'PHOTO',
      reference: evidenceReference,
      actor: params.actor,
    });

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'LOGISTICS_UNLOADING_REQUESTED',
      details: `Descarga solicitada para ${entry.id}.`,
      proofUrl: evidenceReference,
      metadata: {
        entryId: entry.id,
        location: params.currentLocation,
      },
    });

    await updateDoc(ref, {
      status: 'AGUARDANDO_DESCARGA',
      currentLocation: params.currentLocation.trim(),
      evidences,
      immutableAuditHash: audit.hash,
      immutable: true,
      updatedAt: serverTimestamp(),
    });

    return {
      ...entry,
      status: 'AGUARDANDO_DESCARGA',
      currentLocation: params.currentLocation.trim(),
      evidences,
      immutableAuditHash: audit.hash,
    };
  },

  async authorizeUnloading(params: {
    entryId: string;
    actor: string;
    evidenceReference: string;
  }): Promise<LogisticsEntry> {
    const evidenceReference = requireEvidenceReference(params.evidenceReference);
    const { ref, entry } = await fetchEntryForUpdate(params.entryId);
    if (entry.status !== 'AGUARDANDO_DESCARGA') {
      throw new Error('Somente solicitacoes aguardando descarga podem ser autorizadas.');
    }

    const evidences = appendEvidence(entry, {
      type: 'SALE_AUTHORIZATION',
      reference: evidenceReference,
      actor: params.actor,
    });
    const unloadAuthorizedAt = nowIso();

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'LOGISTICS_UNLOADING_AUTHORIZED',
      details: `Descarga autorizada para ${entry.id}.`,
      proofUrl: evidenceReference,
      metadata: { entryId: entry.id },
    });

    await updateDoc(ref, {
      status: 'DESCARGA_AUTORIZADA',
      unloadAuthorizedBy: params.actor,
      unloadAuthorizedAt,
      evidences,
      immutableAuditHash: audit.hash,
      immutable: true,
      updatedAt: serverTimestamp(),
    });

    return {
      ...entry,
      status: 'DESCARGA_AUTORIZADA',
      unloadAuthorizedBy: params.actor,
      unloadAuthorizedAt,
      evidences,
      immutableAuditHash: audit.hash,
    };
  },

  async finalizeTransport(params: {
    entryId: string;
    actor: string;
    evidenceReference: string;
  }): Promise<LogisticsEntry> {
    const evidenceReference = requireEvidenceReference(params.evidenceReference);
    const { ref, entry } = await fetchEntryForUpdate(params.entryId);
    if (entry.status !== 'DESCARGA_AUTORIZADA') {
      throw new Error('Finalize somente apos autorizacao de descarga.');
    }

    const evidences = appendEvidence(entry, {
      type: 'QR',
      reference: evidenceReference,
      actor: params.actor,
    });

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'LOGISTICS_COMPLETED',
      details: `Transporte ${entry.id} finalizado com evidencias.`,
      proofUrl: evidenceReference,
      metadata: { entryId: entry.id },
    });

    await updateDoc(ref, {
      status: 'FINALIZADO',
      evidences,
      immutableAuditHash: audit.hash,
      immutable: true,
      updatedAt: serverTimestamp(),
    });

    return {
      ...entry,
      status: 'FINALIZADO',
      evidences,
      immutableAuditHash: audit.hash,
    };
  },
};
