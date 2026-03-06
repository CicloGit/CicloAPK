import {
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
  ProducerApplicationArea,
  ProducerAnimal,
  ProducerAnimalLot,
  ProducerExpense,
  ProducerInput,
  ProducerInputType,
  ProducerOperationalActivity,
  ProducerTraceEvent,
  ProducerTargetSpecies,
} from '../types';
import { parseDateToTimestamp } from './dateUtils';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const lotsCollection = collection(db, 'producerAnimalLots');
const animalsCollection = collection(db, 'producerAnimals');
const inputsCollection = collection(db, 'producerInputs');
const expensesCollection = collection(db, 'producerOperationalExpenses');
const activitiesCollection = collection(db, 'producerOperationalActivities');
const trackingCollection = collection(db, 'producerTrackingCodes');

const UNITARY_SPECIES = new Set<ProducerAnimal['species']>(['BOVINO', 'SUINO', 'OVINO']);
const GROUPED_SPECIES = new Set<ProducerAnimal['species']>(['AVE', 'PEIXE', 'OUTRO']);

const normalizeSpecies = (value: unknown): ProducerAnimal['species'] => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (
    normalized === 'BOVINO' ||
    normalized === 'SUINO' ||
    normalized === 'OVINO' ||
    normalized === 'CAPRINO' ||
    normalized === 'EQUINO' ||
    normalized === 'AVE' ||
    normalized === 'PEIXE' ||
    normalized === 'OUTRO'
  ) {
    return normalized as ProducerAnimal['species'];
  }
  return 'BOVINO';
};

const normalizeTrackingCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');

const buildTraceDocId = (entityType: 'ANIMAL' | 'LOT', code: string): string =>
  `${entityType}_${normalizeTrackingCode(code)}`;

const normalizeTraceEventType = (value: unknown): ProducerTraceEvent['eventType'] => {
  const normalized = String(value ?? '').toUpperCase();
  if (
    normalized === 'CREATED' ||
    normalized === 'LOT_CREATED' ||
    normalized === 'TRANSFERRED' ||
    normalized === 'CYCLE_CLOSED' ||
    normalized === 'GENEALOGY_LINKED'
  ) {
    return normalized as ProducerTraceEvent['eventType'];
  }
  return 'CREATED';
};

const toTraceEvent = (raw: unknown): ProducerTraceEvent | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const value = raw as Record<string, unknown>;
  return {
    at: String(value.at ?? new Date().toISOString()),
    eventType: normalizeTraceEventType(value.eventType),
    ownerLabel: value.ownerLabel ? String(value.ownerLabel) : undefined,
    locationLabel: value.locationLabel ? String(value.locationLabel) : undefined,
    relatedCode: value.relatedCode ? String(value.relatedCode) : undefined,
    notes: value.notes ? String(value.notes) : undefined,
  };
};

const toTraceTrail = (raw: unknown): ProducerTraceEvent[] =>
  Array.isArray(raw)
    ? raw
        .map((item) => toTraceEvent(item))
        .filter((item): item is ProducerTraceEvent => item !== null)
        .sort((a, b) => a.at.localeCompare(b.at))
    : [];

const appendTraceEvent = (
  existing: ProducerTraceEvent[] | undefined,
  nextEvent: ProducerTraceEvent
): ProducerTraceEvent[] => [...(existing ?? []), nextEvent];

const toLot = (id: string, raw: Record<string, unknown>): ProducerAnimalLot => ({
  id,
  name: String(raw.name ?? ''),
  trackingCode: raw.trackingCode ? String(raw.trackingCode) : undefined,
  category: String(raw.category ?? ''),
  headcount: Number(raw.headcount ?? 0),
  averageWeightKg: Number(raw.averageWeightKg ?? 0),
  species: raw.species ? normalizeSpecies(raw.species) : undefined,
  phase: raw.phase ? String(raw.phase) : undefined,
  ageInDays: raw.ageInDays !== undefined && raw.ageInDays !== null ? Number(raw.ageInDays) : undefined,
  pastureId: raw.pastureId ? String(raw.pastureId) : undefined,
  animalIds: Array.isArray(raw.animalIds) ? (raw.animalIds as string[]).map((item) => String(item)) : undefined,
  trackingMode: raw.trackingMode === 'WEIGHT' ? 'WEIGHT' : raw.trackingMode === 'UNIT' ? 'UNIT' : undefined,
  totalWeightKg: raw.totalWeightKg !== undefined && raw.totalWeightKg !== null ? Number(raw.totalWeightKg) : undefined,
  distributionArea: raw.distributionArea ? String(raw.distributionArea) : undefined,
  lifecycleStatus: (() => {
    const normalized = String(raw.lifecycleStatus ?? '').toUpperCase();
    if (normalized === 'TRANSFERRED' || normalized === 'CYCLE_CLOSED') {
      return normalized as ProducerAnimalLot['lifecycleStatus'];
    }
    return 'ACTIVE';
  })(),
  primitiveOriginCode: raw.primitiveOriginCode ? String(raw.primitiveOriginCode) : undefined,
  primitiveOriginLocation: raw.primitiveOriginLocation ? String(raw.primitiveOriginLocation) : undefined,
  ownershipTrail: toTraceTrail(raw.ownershipTrail),
  createdAt: String(raw.createdAt ?? ''),
});

const toAnimal = (id: string, raw: Record<string, unknown>): ProducerAnimal => ({
  id,
  earringCode: String(raw.earringCode ?? ''),
  trackingCode: raw.trackingCode ? String(raw.trackingCode) : undefined,
  species: normalizeSpecies(raw.species),
  category: String(raw.category ?? ''),
  trackingMode: raw.trackingMode === 'WEIGHT' ? 'WEIGHT' : 'UNIT',
  currentWeightKg: raw.currentWeightKg !== undefined && raw.currentWeightKg !== null ? Number(raw.currentWeightKg) : undefined,
  pastureId: raw.pastureId ? String(raw.pastureId) : undefined,
  lotId: raw.lotId ? String(raw.lotId) : undefined,
  status: (() => {
    const normalized = String(raw.status ?? '').toUpperCase();
    if (normalized === 'IN_LOT' || normalized === 'AUCTION' || normalized === 'SOLD') {
      return normalized as ProducerAnimal['status'];
    }
    return 'ACTIVE';
  })(),
  lifecycleStatus: (() => {
    const normalized = String(raw.lifecycleStatus ?? '').toUpperCase();
    if (normalized === 'TRANSFERRED' || normalized === 'CYCLE_CLOSED') {
      return normalized as ProducerAnimal['lifecycleStatus'];
    }
    return 'ACTIVE';
  })(),
  primitiveOriginCode: raw.primitiveOriginCode ? String(raw.primitiveOriginCode) : undefined,
  primitiveOriginLocation: raw.primitiveOriginLocation ? String(raw.primitiveOriginLocation) : undefined,
  parentAnimalIds: Array.isArray(raw.parentAnimalIds) ? (raw.parentAnimalIds as string[]).map((item) => String(item)) : undefined,
  genealogyCode: raw.genealogyCode ? String(raw.genealogyCode) : undefined,
  ownershipTrail: toTraceTrail(raw.ownershipTrail),
  createdAt: String(raw.createdAt ?? ''),
});

const inferInputType = (raw: Record<string, unknown>): ProducerInputType => {
  const directType = String(raw.inputType ?? '').toUpperCase();
  if (
    directType === 'ADUBO' ||
    directType === 'RACAO' ||
    directType === 'SAL_MINERAL' ||
    directType === 'MEDICAMENTO' ||
    directType === 'SEMENTE' ||
    directType === 'DEFENSIVO' ||
    directType === 'OUTRO'
  ) {
    return directType;
  }

  const name = String(raw.name ?? '').toLowerCase();
  if (name.includes('adubo') || name.includes('fertiliz')) return 'ADUBO';
  if (name.includes('racao')) return 'RACAO';
  if (name.includes('sal mineral')) return 'SAL_MINERAL';
  return 'OUTRO';
};

const inferApplicationArea = (raw: Record<string, unknown>): ProducerApplicationArea => {
  const directArea = String(raw.applicationArea ?? '').toUpperCase();
  if (
    directArea === 'PASTAGEM' ||
    directArea === 'LAVOURA' ||
    directArea === 'CONFINAMENTO' ||
    directArea === 'AVIARIO' ||
    directArea === 'CURRAL' ||
    directArea === 'GERAL'
  ) {
    return directArea;
  }

  const inputType = inferInputType(raw);
  if (inputType === 'ADUBO' || inputType === 'SEMENTE' || inputType === 'DEFENSIVO') return 'LAVOURA';
  if (inputType === 'RACAO' || inputType === 'SAL_MINERAL') return 'CONFINAMENTO';
  return 'GERAL';
};

const inferTargetSpecies = (raw: Record<string, unknown>): ProducerTargetSpecies[] => {
  const species = Array.isArray(raw.targetSpecies) ? raw.targetSpecies : [];
  const normalized = species
    .map((entry) => String(entry).toUpperCase())
    .filter(
      (entry): entry is ProducerTargetSpecies =>
        entry === 'BOVINOS' ||
        entry === 'PEIXES' ||
        entry === 'AVES' ||
        entry === 'SUINOS' ||
        entry === 'OVINOS' ||
        entry === 'CAPRINOS' ||
        entry === 'EQUINOS'
    );
  if (normalized.length > 0) {
    return normalized;
  }

  const name = String(raw.name ?? '').toLowerCase();
  if (name.includes('peixe') || name.includes('pisc')) return ['PEIXES'];
  if (name.includes('aves')) return ['AVES'];
  if (name.includes('bov')) return ['BOVINOS'];
  return [];
};

const toInput = (id: string, raw: Record<string, unknown>): ProducerInput => ({
  id,
  name: String(raw.name ?? ''),
  inputType: inferInputType(raw),
  applicationArea: inferApplicationArea(raw),
  targetSpecies: inferTargetSpecies(raw),
  launchLinkType: (() => {
    const normalized = String(raw.launchLinkType ?? '').toUpperCase();
    if (normalized === 'ANIMAL' || normalized === 'LOTE' || normalized === 'TALHAO') {
      return normalized as ProducerInput['launchLinkType'];
    }
    return 'GERAL';
  })(),
  linkedAnimalId: raw.linkedAnimalId ? String(raw.linkedAnimalId) : undefined,
  linkedLotId: raw.linkedLotId ? String(raw.linkedLotId) : undefined,
  linkedPlotId: raw.linkedPlotId ? String(raw.linkedPlotId) : undefined,
  unit: String(raw.unit ?? ''),
  unitCost: Number(raw.unitCost ?? 0),
  stock: Number(raw.stock ?? 0),
  createdAt: String(raw.createdAt ?? ''),
});

const inputTypesRequiringSpecies = new Set<ProducerInputType>(['RACAO', 'SAL_MINERAL', 'MEDICAMENTO']);

const isInputClassificationValid = (input: Omit<ProducerInput, 'id' | 'createdAt'>): boolean => {
  if (inputTypesRequiringSpecies.has(input.inputType) && input.targetSpecies.length === 0) {
    return false;
  }
  return true;
};

const toExpense = (id: string, raw: Record<string, unknown>): ProducerExpense => ({
  id,
  description: String(raw.description ?? ''),
  category: (raw.category as ProducerExpense['category']) ?? 'OUTROS',
  amount: Number(raw.amount ?? 0),
  date: String(raw.date ?? ''),
  source: (raw.source as ProducerExpense['source']) ?? 'SISTEMA',
  relatedActivityId: raw.relatedActivityId ? String(raw.relatedActivityId) : undefined,
  relatedPastureId: raw.relatedPastureId ? String(raw.relatedPastureId) : undefined,
  areaHa: raw.areaHa !== undefined && raw.areaHa !== null ? Number(raw.areaHa) : undefined,
  expectedRevenue: raw.expectedRevenue !== undefined && raw.expectedRevenue !== null ? Number(raw.expectedRevenue) : undefined,
  realizedRevenue: raw.realizedRevenue !== undefined && raw.realizedRevenue !== null ? Number(raw.realizedRevenue) : undefined,
  profit: raw.profit !== undefined && raw.profit !== null ? Number(raw.profit) : undefined,
});

const toActivity = (id: string, raw: Record<string, unknown>): ProducerOperationalActivity => ({
  id,
  title: String(raw.title ?? ''),
  details: String(raw.details ?? ''),
  actor: String(raw.actor ?? ''),
  actorRole: (raw.actorRole as ProducerOperationalActivity['actorRole']) ?? 'ADMINISTRADOR',
  date: String(raw.date ?? ''),
  relatedLotId: raw.relatedLotId ? String(raw.relatedLotId) : undefined,
});

const parseQuantity = (raw?: string): number => {
  if (!raw) return 0;
  const normalized = raw.replace(',', '.');
  const match = normalized.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

const toRounded2 = (value: number): number => Number((Number.isFinite(value) ? value : 0).toFixed(2));

const assertAnimalRegistrationRules = (payload: {
  species: ProducerAnimal['species'];
  trackingMode: ProducerAnimal['trackingMode'];
  earringCode: string;
}) => {
  if (UNITARY_SPECIES.has(payload.species) && payload.trackingMode !== 'UNIT') {
    throw new Error('Gado, ovinos e suinos devem usar rastreio unitario por brinco/chip.');
  }
  if (UNITARY_SPECIES.has(payload.species) && !payload.earringCode.trim()) {
    throw new Error('Para gado, ovinos e suinos o brinco/chip unitario e obrigatorio.');
  }
  if (GROUPED_SPECIES.has(payload.species) && payload.trackingMode !== 'WEIGHT') {
    throw new Error('Aves, peixes e outros devem ser cadastrados em lote por peso/fase/idade.');
  }
};

const assertInputLinkingRules = (payload: Omit<ProducerInput, 'id' | 'createdAt'>) => {
  const linkType = payload.launchLinkType ?? 'GERAL';
  if (linkType === 'ANIMAL' && !payload.linkedAnimalId) {
    throw new Error('Lancamento de insumo por animal exige a selecao do animal.');
  }
  if (linkType === 'LOTE' && !payload.linkedLotId) {
    throw new Error('Lancamento de insumo por lote exige a selecao do lote.');
  }
  if (linkType === 'TALHAO' && !payload.linkedPlotId) {
    throw new Error('Lancamento de insumo por talhao exige a selecao do talhao/pasto.');
  }
};

const buildOwnershipEvent = (params: {
  eventType: ProducerTraceEvent['eventType'];
  ownerLabel?: string;
  locationLabel?: string;
  relatedCode?: string;
  notes?: string;
}): ProducerTraceEvent => ({
  at: new Date().toISOString(),
  eventType: params.eventType,
  ownerLabel: params.ownerLabel,
  locationLabel: params.locationLabel,
  relatedCode: params.relatedCode,
  notes: params.notes,
});

const deriveGenealogyCode = (params: { trackingCode: string; parentTrackingCodes: string[] }): string | undefined => {
  if (params.parentTrackingCodes.length === 0) {
    return undefined;
  }
  const parentSegment = params.parentTrackingCodes
    .map((item) => normalizeTrackingCode(item))
    .slice(0, 2)
    .join('-');
  return `${parentSegment}>${normalizeTrackingCode(params.trackingCode)}`;
};

const reserveTrackingCode = async (params: {
  context: Awaited<ReturnType<typeof resolveTenantContext>>;
  entityType: 'ANIMAL' | 'LOT';
  trackingCode: string;
  entityId: string;
  ownerLabel?: string;
  locationLabel?: string;
  parentCodes?: string[];
}): Promise<ProducerTraceEvent[]> => {
  const normalizedCode = normalizeTrackingCode(params.trackingCode);
  const ref = doc(db, 'producerTrackingCodes', buildTraceDocId(params.entityType, normalizedCode));
  const snapshot = await getDoc(ref);
  const existingRaw = snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null;
  const currentLifecycle = String(existingRaw?.lifecycleStatus ?? '').toUpperCase();
  if (snapshot.exists() && currentLifecycle !== 'CYCLE_CLOSED') {
    throw new Error(
      `Codigo de rastreio ${normalizedCode} ja esta em uso. Reutilizacao permitida somente apos finalizacao do ciclo de vida.`
    );
  }

  const existingTrail = toTraceTrail(existingRaw?.ownershipTrail);
  let nextTrail = appendTraceEvent(
    existingTrail,
    buildOwnershipEvent({
      eventType: params.entityType === 'ANIMAL' ? 'CREATED' : 'LOT_CREATED',
      ownerLabel: params.ownerLabel,
      locationLabel: params.locationLabel,
      notes: snapshot.exists() ? 'Codigo reutilizado apos ciclo encerrado.' : 'Codigo inicial criado.',
    })
  );

  if ((params.parentCodes ?? []).length > 0) {
    nextTrail = appendTraceEvent(
      nextTrail,
      buildOwnershipEvent({
        eventType: 'GENEALOGY_LINKED',
        relatedCode: params.parentCodes?.map((item) => normalizeTrackingCode(item)).join(','),
        notes: 'Vinculo genealogico registrado para cria.',
      })
    );
  }

  await setDoc(
    ref,
    withTenantFields(
      {
        entityType: params.entityType,
        trackingCode: normalizedCode,
        lifecycleStatus: 'ACTIVE',
        currentEntityId: params.entityId,
        originTenantId: existingRaw?.originTenantId ? String(existingRaw.originTenantId) : params.context.tenantId,
        originOwnerLabel: existingRaw?.originOwnerLabel ? String(existingRaw.originOwnerLabel) : params.ownerLabel ?? 'Produtor',
        originLocationLabel:
          existingRaw?.originLocationLabel ? String(existingRaw.originLocationLabel) : params.locationLabel ?? 'Origem nao informada',
        currentTenantId: params.context.tenantId,
        currentOwnerLabel: params.ownerLabel ?? 'Produtor',
        currentLocationLabel: params.locationLabel ?? 'Local nao informado',
        ownershipTrail: nextTrail,
        updatedAt: serverTimestamp(),
      },
      params.context
    ),
    { merge: true }
  );

  return nextTrail;
};

const appendTransferToTrackingCode = async (params: {
  context: Awaited<ReturnType<typeof resolveTenantContext>>;
  entityType: 'ANIMAL' | 'LOT';
  trackingCode: string;
  entityId: string;
  destinationOwner: string;
  destinationLocation?: string;
  relatedCode?: string;
  notes?: string;
}): Promise<ProducerTraceEvent[]> => {
  const normalizedCode = normalizeTrackingCode(params.trackingCode);
  const ref = doc(db, 'producerTrackingCodes', buildTraceDocId(params.entityType, normalizedCode));
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return [];
  }

  const raw = snapshot.data() as Record<string, unknown>;
  const trail = toTraceTrail(raw.ownershipTrail);
  const nextTrail = appendTraceEvent(
    trail,
    buildOwnershipEvent({
      eventType: 'TRANSFERRED',
      ownerLabel: params.destinationOwner,
      locationLabel: params.destinationLocation,
      relatedCode: params.relatedCode,
      notes: params.notes ?? 'Transferencia registrada entre propriedades.',
    })
  );

  await setDoc(
    ref,
    withTenantFields(
      {
        lifecycleStatus: 'TRANSFERRED',
        currentEntityId: params.entityId,
        currentTenantId: params.context.tenantId,
        currentOwnerLabel: params.destinationOwner,
        currentLocationLabel: params.destinationLocation ?? 'Destino nao informado',
        ownershipTrail: nextTrail,
        updatedAt: serverTimestamp(),
      },
      params.context
    ),
    { merge: true }
  );

  return nextTrail;
};

const closeTrackingCodeLifecycle = async (params: {
  context: Awaited<ReturnType<typeof resolveTenantContext>>;
  entityType: 'ANIMAL' | 'LOT';
  trackingCode: string;
  entityId: string;
  ownerLabel?: string;
  locationLabel?: string;
  notes?: string;
}): Promise<ProducerTraceEvent[]> => {
  const normalizedCode = normalizeTrackingCode(params.trackingCode);
  const ref = doc(db, 'producerTrackingCodes', buildTraceDocId(params.entityType, normalizedCode));
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    return [];
  }

  const raw = snapshot.data() as Record<string, unknown>;
  const trail = toTraceTrail(raw.ownershipTrail);
  const nextTrail = appendTraceEvent(
    trail,
    buildOwnershipEvent({
      eventType: 'CYCLE_CLOSED',
      ownerLabel: params.ownerLabel ?? String(raw.currentOwnerLabel ?? ''),
      locationLabel: params.locationLabel ?? String(raw.currentLocationLabel ?? ''),
      notes: params.notes ?? 'Ciclo de rastreio encerrado.',
    })
  );

  await setDoc(
    ref,
    withTenantFields(
      {
        lifecycleStatus: 'CYCLE_CLOSED',
        currentEntityId: params.entityId,
        currentTenantId: params.context.tenantId,
        currentOwnerLabel: params.ownerLabel ?? raw.currentOwnerLabel ?? null,
        currentLocationLabel: params.locationLabel ?? raw.currentLocationLabel ?? null,
        ownershipTrail: nextTrail,
        updatedAt: serverTimestamp(),
      },
      params.context
    ),
    { merge: true }
  );

  return nextTrail;
};

export const producerOpsService = {
  async listAnimals(): Promise<ProducerAnimal[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(animalsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, animal: toAnimal(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { animal: ProducerAnimal }) => item.animal)
      .sort((a: ProducerAnimal, b: ProducerAnimal) => a.earringCode.localeCompare(b.earringCode));
  },

  async createAnimal(
    payload: Omit<ProducerAnimal, 'id' | 'createdAt' | 'status'> & { status?: ProducerAnimal['status'] }
  ): Promise<ProducerAnimal> {
    const normalizedSpecies = normalizeSpecies(payload.species);
    const normalizedEarring = payload.earringCode.trim().toUpperCase();
    const normalizedParentIds = (payload.parentAnimalIds ?? []).map((item) => item.trim()).filter((item) => item.length > 0);

    assertAnimalRegistrationRules({
      species: normalizedSpecies,
      trackingMode: payload.trackingMode,
      earringCode: normalizedEarring,
    });

    const currentAnimals = await this.listAnimals();
    if (normalizedEarring) {
      const duplicated = currentAnimals.some(
        (animal) =>
          animal.earringCode.trim().toUpperCase() === normalizedEarring &&
          (animal.lifecycleStatus ?? 'ACTIVE') !== 'CYCLE_CLOSED'
      );
      if (duplicated) {
        throw new Error('Ja existe animal cadastrado para este identificador.');
      }
    }

    const context = await resolveTenantContext();
    const resolvedTrackingCode = normalizeTrackingCode(normalizedEarring || `${normalizedSpecies}-${Date.now()}`);
    const parentTrackingCodes = currentAnimals
      .filter((animal) => normalizedParentIds.includes(animal.id))
      .map((animal) => normalizeTrackingCode(animal.trackingCode || animal.earringCode))
      .filter((value) => value.length > 0);
    const ownershipTrail = await reserveTrackingCode({
      context,
      entityType: 'ANIMAL',
      trackingCode: resolvedTrackingCode,
      entityId: `ANM-${Date.now()}`,
      ownerLabel: context.userId,
      locationLabel: payload.pastureId,
      parentCodes: parentTrackingCodes,
    });
    const genealogyCode = deriveGenealogyCode({
      trackingCode: resolvedTrackingCode,
      parentTrackingCodes: parentTrackingCodes,
    });

    const newAnimal: ProducerAnimal = {
      id: `ANM-${Date.now()}`,
      earringCode: resolvedTrackingCode,
      trackingCode: resolvedTrackingCode,
      species: normalizedSpecies,
      category: payload.category.trim() || 'Nao classificado',
      trackingMode: payload.trackingMode,
      currentWeightKg: payload.currentWeightKg,
      pastureId: payload.pastureId,
      lotId: payload.lotId,
      status: payload.status ?? 'ACTIVE',
      lifecycleStatus: 'ACTIVE',
      primitiveOriginCode: resolvedTrackingCode,
      primitiveOriginLocation: payload.pastureId,
      parentAnimalIds: normalizedParentIds.length > 0 ? normalizedParentIds : undefined,
      genealogyCode,
      ownershipTrail,
      createdAt: new Date().toLocaleString('pt-BR'),
    };

    await setDoc(
      doc(db, 'producerAnimals', newAnimal.id),
      withTenantFields(
        {
          ...newAnimal,
          createdAtTs: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return newAnimal;
  },

  async registerSlaughterAndReturnCollar(params: {
    animalId: string;
    returnPastureId?: string;
    notes?: string;
  }): Promise<ProducerAnimal> {
    const normalizedAnimalId = params.animalId.trim();
    if (!normalizedAnimalId) {
      throw new Error('Selecione o animal para registrar o abate.');
    }

    const context = await resolveTenantContext();
    const animalRef = doc(db, 'producerAnimals', normalizedAnimalId);
    const snapshot = await getDoc(animalRef);
    if (!snapshot.exists()) {
      throw new Error('Animal nao encontrado para encerramento de ciclo.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para encerrar ciclo de animal de outro tenant.');
    }

    const current = toAnimal(snapshot.id, raw);
    if ((current.lifecycleStatus ?? 'ACTIVE') === 'CYCLE_CLOSED') {
      return current;
    }

    const trackingCode = normalizeTrackingCode(current.trackingCode || current.earringCode);
    const closureNote = params.notes?.trim() || 'Abate registrado. Colar devolvido para recadastro futuro.';
    const returnPastureId = params.returnPastureId?.trim() || current.pastureId;
    const closeEvent = buildOwnershipEvent({
      eventType: 'CYCLE_CLOSED',
      ownerLabel: context.userId,
      locationLabel: returnPastureId,
      notes: closureNote,
    });
    const animalTrail = appendTraceEvent(current.ownershipTrail, closeEvent);
    await closeTrackingCodeLifecycle({
      context,
      entityType: 'ANIMAL',
      trackingCode,
      entityId: current.id,
      ownerLabel: context.userId,
      locationLabel: returnPastureId,
      notes: closureNote,
    });

    await setDoc(
      animalRef,
      withTenantFields(
        {
          status: 'SOLD',
          lifecycleStatus: 'CYCLE_CLOSED',
          lotId: null,
          pastureId: returnPastureId ?? null,
          ownershipTrail: animalTrail,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return {
      ...current,
      status: 'SOLD',
      lifecycleStatus: 'CYCLE_CLOSED',
      lotId: undefined,
      pastureId: returnPastureId,
      ownershipTrail: animalTrail,
    };
  },

  async listAnimalLots(): Promise<ProducerAnimalLot[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(lotsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, lot: toLot(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { lot: ProducerAnimalLot }) => item.lot)
      .sort((a: ProducerAnimalLot, b: ProducerAnimalLot) => a.name.localeCompare(b.name));
  },

  async createAnimalLot(payload: Omit<ProducerAnimalLot, 'id' | 'createdAt'>): Promise<ProducerAnimalLot> {
    if (!payload.name.trim() || !payload.category.trim()) {
      throw new Error('Informe nome e categoria para cadastrar o lote.');
    }
    if (!Number.isFinite(payload.headcount) || payload.headcount <= 0) {
      throw new Error('Informe a quantidade do lote.');
    }

    const context = await resolveTenantContext();
    const newLot: ProducerAnimalLot = {
      id: `LOT-${Date.now()}`,
      name: payload.name.trim(),
      category: payload.category.trim(),
      headcount: payload.headcount,
      averageWeightKg: Number(payload.averageWeightKg ?? 0),
      species: payload.species,
      phase: payload.phase?.trim() || undefined,
      ageInDays: payload.ageInDays,
      pastureId: payload.pastureId,
      animalIds: payload.animalIds,
      trackingMode: payload.trackingMode,
      totalWeightKg: payload.totalWeightKg,
      distributionArea: payload.distributionArea,
      createdAt: new Date().toLocaleString('pt-BR'),
    };

    await setDoc(
      doc(db, 'producerAnimalLots', newLot.id),
      withTenantFields(
        {
          ...newLot,
          createdAtTs: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return newLot;
  },

  async createTrackedWeightLot(payload: {
    name: string;
    category: string;
    species: ProducerAnimal['species'];
    phase: string;
    ageInDays?: number;
    headcount: number;
    totalWeightKg: number;
    pastureId?: string;
    distributionArea?: string;
  }): Promise<ProducerAnimalLot> {
    const species = normalizeSpecies(payload.species);
    if (!GROUPED_SPECIES.has(species)) {
      throw new Error('Cadastro por lote/peso e valido apenas para aves, peixes e outros.');
    }
    if (!payload.phase.trim()) {
      throw new Error('Informe a fase do lote (ex.: inicial, recria, finalizacao).');
    }
    if (!Number.isFinite(payload.totalWeightKg) || payload.totalWeightKg <= 0) {
      throw new Error('Informe o peso total do lote.');
    }
    if (!Number.isFinite(payload.headcount) || payload.headcount <= 0) {
      throw new Error('Informe a quantidade de unidades do lote.');
    }

    const averageWeightKg = payload.totalWeightKg / payload.headcount;
    return this.createAnimalLot({
      name: payload.name,
      category: payload.category,
      species,
      phase: payload.phase,
      ageInDays: payload.ageInDays,
      headcount: payload.headcount,
      averageWeightKg: Number(averageWeightKg.toFixed(2)),
      trackingMode: 'WEIGHT',
      totalWeightKg: payload.totalWeightKg,
      pastureId: payload.pastureId,
      distributionArea: payload.distributionArea,
    });
  },

  async createAnimalLotFromAnimalIds(payload: {
    name: string;
    category: string;
    animalIds: string[];
    pastureId?: string;
    distributionArea?: string;
  }): Promise<ProducerAnimalLot> {
    const selectedAnimalIds = payload.animalIds.map((item) => item.trim()).filter((item) => item.length > 0);
    if (selectedAnimalIds.length === 0) {
      throw new Error('Informe ao menos um animal para formar o lote.');
    }

    const animals = await this.listAnimals();
    const selectedAnimals = animals.filter((animal) => selectedAnimalIds.includes(animal.id));
    if (selectedAnimals.length !== selectedAnimalIds.length) {
      throw new Error('Nem todos os animais selecionados foram encontrados.');
    }
    if (selectedAnimals.some((animal) => animal.trackingMode !== 'UNIT' || GROUPED_SPECIES.has(animal.species))) {
      throw new Error('Somente animais unitarios com brinco/chip podem compor lote por leitura.');
    }

    const totalWeight = selectedAnimals.reduce((sum, animal) => sum + Number(animal.currentWeightKg ?? 0), 0);
    const averageWeight = selectedAnimals.length > 0 ? totalWeight / selectedAnimals.length : 0;
    const inferredCategory = payload.category.trim() || selectedAnimals[0]?.category || 'Lote Animal';
    const inferredArea = payload.distributionArea ?? selectedAnimals[0]?.pastureId;
    const inferredSpecies = selectedAnimals[0]?.species;

    const lot = await this.createAnimalLot({
      name: payload.name.trim(),
      category: inferredCategory,
      species: inferredSpecies,
      headcount: selectedAnimals.length,
      averageWeightKg: Number(averageWeight.toFixed(2)),
      pastureId: payload.pastureId,
      animalIds: selectedAnimalIds,
      trackingMode: 'UNIT',
      totalWeightKg: Number(totalWeight.toFixed(2)),
      distributionArea: inferredArea,
    });

    const context = await resolveTenantContext();
    await Promise.all(
      selectedAnimals.map((animal) =>
        setDoc(
          doc(db, 'producerAnimals', animal.id),
          withTenantFields(
            {
              lotId: lot.id,
              status: 'IN_LOT',
              updatedAt: serverTimestamp(),
            },
            context
          ),
          { merge: true }
        )
      )
    );

    return lot;
  },

  async splitUnitAnimalLot(payload: {
    sourceLotId: string;
    newLotName: string;
    newLotCategory?: string;
    separatedHeadcount: number;
    pastureId?: string;
    distributionArea?: string;
  }): Promise<{ sourceLot: ProducerAnimalLot; createdLot: ProducerAnimalLot }> {
    if (!payload.sourceLotId.trim()) {
      throw new Error('Selecione o lote de origem para apartacao.');
    }
    if (!payload.newLotName.trim()) {
      throw new Error('Informe o nome do novo lote de apartacao.');
    }
    if (!Number.isFinite(payload.separatedHeadcount) || payload.separatedHeadcount <= 0) {
      throw new Error('Informe a quantidade a separar em cabecas.');
    }

    const [lots, animals] = await Promise.all([this.listAnimalLots(), this.listAnimals()]);
    const sourceLot = lots.find((lot) => lot.id === payload.sourceLotId);
    if (!sourceLot) {
      throw new Error('Lote de origem nao encontrado.');
    }
    if (sourceLot.trackingMode === 'WEIGHT') {
      throw new Error('Este fluxo de apartacao e valido apenas para lotes unitarios.');
    }

    const lotAnimalIds = (sourceLot.animalIds ?? []).map((item) => item.trim()).filter((item) => item.length > 0);
    const fallbackAnimalIds = animals
      .filter((animal) => animal.lotId === sourceLot.id && animal.trackingMode === 'UNIT')
      .map((animal) => animal.id);
    const sourceAnimalIds = Array.from(new Set(lotAnimalIds.length > 0 ? lotAnimalIds : fallbackAnimalIds));
    if (sourceAnimalIds.length < 2) {
      throw new Error('O lote de origem precisa ter ao menos 2 animais para apartacao.');
    }
    if (payload.separatedHeadcount >= sourceAnimalIds.length) {
      throw new Error('A apartacao deve deixar ao menos 1 animal no lote de origem.');
    }

    const movingAnimalIds = sourceAnimalIds.slice(0, payload.separatedHeadcount);
    const movingAnimals = animals.filter((animal) => movingAnimalIds.includes(animal.id));
    if (movingAnimals.length !== movingAnimalIds.length) {
      throw new Error('Nao foi possivel resolver os animais selecionados para apartacao.');
    }

    const movedTotalWeight = movingAnimals.reduce((sum, animal) => sum + Number(animal.currentWeightKg ?? 0), 0);
    const movedAverageWeight = movedTotalWeight / movingAnimals.length;
    const createdLot = await this.createAnimalLot({
      name: payload.newLotName.trim(),
      category: payload.newLotCategory?.trim() || sourceLot.category,
      species: sourceLot.species ?? movingAnimals[0]?.species,
      headcount: movingAnimals.length,
      averageWeightKg: toRounded2(movedAverageWeight),
      pastureId: payload.pastureId ?? sourceLot.pastureId,
      animalIds: movingAnimalIds,
      trackingMode: 'UNIT',
      totalWeightKg: toRounded2(movedTotalWeight),
      distributionArea: payload.distributionArea ?? sourceLot.distributionArea,
    });

    const remainingAnimalIds = sourceAnimalIds.filter((animalId) => !movingAnimalIds.includes(animalId));
    const remainingAnimals = animals.filter((animal) => remainingAnimalIds.includes(animal.id));
    const remainingTotalWeight = remainingAnimals.reduce((sum, animal) => sum + Number(animal.currentWeightKg ?? 0), 0);
    const remainingAverageWeight = remainingAnimalIds.length > 0 ? remainingTotalWeight / remainingAnimalIds.length : 0;
    const updatedSourceLot: ProducerAnimalLot = {
      ...sourceLot,
      headcount: remainingAnimalIds.length,
      averageWeightKg: toRounded2(remainingAverageWeight),
      animalIds: remainingAnimalIds,
      totalWeightKg: toRounded2(remainingTotalWeight),
    };

    const context = await resolveTenantContext();
    await Promise.all([
      ...movingAnimals.map((animal) =>
        setDoc(
          doc(db, 'producerAnimals', animal.id),
          withTenantFields(
            {
              lotId: createdLot.id,
              status: 'IN_LOT',
              updatedAt: serverTimestamp(),
            },
            context
          ),
          { merge: true }
        )
      ),
      setDoc(
        doc(db, 'producerAnimalLots', sourceLot.id),
        withTenantFields(
          {
            headcount: updatedSourceLot.headcount,
            averageWeightKg: updatedSourceLot.averageWeightKg,
            animalIds: updatedSourceLot.animalIds,
            totalWeightKg: updatedSourceLot.totalWeightKg,
            updatedAt: serverTimestamp(),
          },
          context
        ),
        { merge: true }
      ),
    ]);

    return {
      sourceLot: updatedSourceLot,
      createdLot,
    };
  },

  async splitTrackedWeightLot(payload: {
    sourceLotId: string;
    newLotName: string;
    newLotCategory?: string;
    separatedHeadcount: number;
    separatedWeightKg: number;
    phase?: string;
    ageInDays?: number;
    pastureId?: string;
    distributionArea?: string;
  }): Promise<{ sourceLot: ProducerAnimalLot; createdLot: ProducerAnimalLot }> {
    if (!payload.sourceLotId.trim()) {
      throw new Error('Selecione o lote de origem para separacao.');
    }
    if (!payload.newLotName.trim()) {
      throw new Error('Informe o nome do novo lote separado.');
    }
    if (!Number.isFinite(payload.separatedHeadcount) || payload.separatedHeadcount <= 0) {
      throw new Error('Informe a quantidade separada (cabecas).');
    }
    if (!Number.isFinite(payload.separatedWeightKg) || payload.separatedWeightKg <= 0) {
      throw new Error('Informe o peso separado (kg).');
    }

    const lots = await this.listAnimalLots();
    const sourceLot = lots.find((lot) => lot.id === payload.sourceLotId);
    if (!sourceLot) {
      throw new Error('Lote de origem nao encontrado.');
    }
    if (sourceLot.trackingMode !== 'WEIGHT') {
      throw new Error('Este fluxo e valido apenas para lotes de peso/fase.');
    }

    const sourceHeadcount = Number(sourceLot.headcount ?? 0);
    const sourceWeight = Number(sourceLot.totalWeightKg ?? 0);
    if (payload.separatedHeadcount >= sourceHeadcount) {
      throw new Error('A separacao deve deixar ao menos 1 cabeca no lote de origem.');
    }
    if (payload.separatedWeightKg >= sourceWeight) {
      throw new Error('A separacao deve deixar peso remanescente no lote de origem.');
    }

    const species = sourceLot.species ?? 'OUTRO';
    const createdLot = await this.createTrackedWeightLot({
      name: payload.newLotName.trim(),
      category: payload.newLotCategory?.trim() || sourceLot.category,
      species,
      phase: payload.phase?.trim() || sourceLot.phase || 'separado',
      ageInDays: payload.ageInDays ?? sourceLot.ageInDays,
      headcount: payload.separatedHeadcount,
      totalWeightKg: toRounded2(payload.separatedWeightKg),
      pastureId: payload.pastureId ?? sourceLot.pastureId,
      distributionArea: payload.distributionArea ?? sourceLot.distributionArea,
    });

    const remainingHeadcount = sourceHeadcount - payload.separatedHeadcount;
    const remainingWeight = sourceWeight - payload.separatedWeightKg;
    const updatedSourceLot: ProducerAnimalLot = {
      ...sourceLot,
      headcount: remainingHeadcount,
      totalWeightKg: toRounded2(remainingWeight),
      averageWeightKg: toRounded2(remainingHeadcount > 0 ? remainingWeight / remainingHeadcount : 0),
    };

    const context = await resolveTenantContext();
    await setDoc(
      doc(db, 'producerAnimalLots', sourceLot.id),
      withTenantFields(
        {
          headcount: updatedSourceLot.headcount,
          totalWeightKg: updatedSourceLot.totalWeightKg,
          averageWeightKg: updatedSourceLot.averageWeightKg,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return {
      sourceLot: updatedSourceLot,
      createdLot,
    };
  },

  async listInputs(): Promise<ProducerInput[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(inputsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, input: toInput(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { input: ProducerInput }) => item.input)
      .sort((a: ProducerInput, b: ProducerInput) => a.name.localeCompare(b.name));
  },

  async createInput(payload: Omit<ProducerInput, 'id' | 'createdAt'>): Promise<ProducerInput> {
    if (!isInputClassificationValid(payload)) {
      throw new Error('Classificacao de insumo invalida para o tipo informado.');
    }
    assertInputLinkingRules(payload);

    const context = await resolveTenantContext();
    const newInput: ProducerInput = {
      id: `INP-${Date.now()}`,
      name: payload.name,
      inputType: payload.inputType,
      applicationArea: payload.applicationArea,
      targetSpecies: payload.targetSpecies,
      launchLinkType: payload.launchLinkType ?? 'GERAL',
      linkedAnimalId: payload.linkedAnimalId,
      linkedLotId: payload.linkedLotId,
      linkedPlotId: payload.linkedPlotId,
      unit: payload.unit,
      unitCost: payload.unitCost,
      stock: payload.stock,
      createdAt: new Date().toLocaleString('pt-BR'),
    };

    await setDoc(
      doc(db, 'producerInputs', newInput.id),
      withTenantFields(
        {
          ...newInput,
          createdAtTs: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return newInput;
  },

  async listExpenses(): Promise<ProducerExpense[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(expensesCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, expense: toExpense(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { expense: ProducerExpense }) => item.expense)
      .sort((a: ProducerExpense, b: ProducerExpense) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async createExpense(payload: Omit<ProducerExpense, 'id' | 'date'>): Promise<ProducerExpense> {
    const context = await resolveTenantContext();
    const newExpense: ProducerExpense = {
      id: `EXP-${Date.now()}`,
      description: payload.description,
      category: payload.category,
      amount: payload.amount,
      date: new Date().toLocaleString('pt-BR'),
      source: payload.source,
      relatedActivityId: payload.relatedActivityId,
      relatedPastureId: payload.relatedPastureId,
      areaHa: payload.areaHa,
      expectedRevenue: payload.expectedRevenue,
      realizedRevenue: payload.realizedRevenue,
      profit: payload.profit,
    };

    await setDoc(
      doc(db, 'producerOperationalExpenses', newExpense.id),
      withTenantFields(
        {
          ...newExpense,
          createdAtTs: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );
    return newExpense;
  },

  async listActivities(): Promise<ProducerOperationalActivity[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(activitiesCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, activity: toActivity(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { activity: ProducerOperationalActivity }) => item.activity)
      .sort((a: ProducerOperationalActivity, b: ProducerOperationalActivity) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async createActivity(payload: Omit<ProducerOperationalActivity, 'id' | 'date'>): Promise<ProducerOperationalActivity> {
    const context = await resolveTenantContext();
    const newActivity: ProducerOperationalActivity = {
      id: `ACT-${Date.now()}`,
      title: payload.title,
      details: payload.details,
      actor: payload.actor,
      actorRole: payload.actorRole,
      date: new Date().toLocaleString('pt-BR'),
      relatedLotId: payload.relatedLotId,
    };
    await setDoc(
      doc(db, 'producerOperationalActivities', newActivity.id),
      withTenantFields(
        {
          ...newActivity,
          createdAtTs: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );
    return newActivity;
  },

  async registerRequestApprovalExpense(params: {
    requestId: string;
    item: string;
    quantity?: string;
    actor: string;
    role: ProducerOperationalActivity['actorRole'];
  }): Promise<void> {
    const [inputs] = await Promise.all([this.listInputs()]);
    const input = inputs.find((entry) => entry.name.toLowerCase() === params.item.toLowerCase());
    const quantity = parseQuantity(params.quantity);
    const estimatedAmount = input && quantity > 0 ? quantity * input.unitCost : 0;
    const classificationDetails = input
      ? ` | tipo=${input.inputType} | local=${input.applicationArea}${input.targetSpecies.length ? ` | especies=${input.targetSpecies.join(',')}` : ''}`
      : '';

    const activity = await this.createActivity({
      title: 'Solicitacao operacional aprovada',
      details: `${params.item} (${params.quantity ?? 'quantidade nao informada'})${classificationDetails}`,
      actor: params.actor,
      actorRole: params.role,
    });

    if (estimatedAmount > 0) {
      await this.createExpense({
        description: `Consumo aprovado: ${params.item}`,
        category: 'INSUMO',
        amount: estimatedAmount,
        source: params.role === 'OPERADOR' ? 'OPERADOR' : 'ADMINISTRADOR',
        relatedActivityId: activity.id,
      });
    }
  },

  async getKpis(): Promise<{
    totalAnimals: number;
    totalExpenses: number;
    costPerHead: number;
  }> {
    const [lots, expenses] = await Promise.all([this.listAnimalLots(), this.listExpenses()]);
    const totalAnimals = lots.reduce((sum, lot) => sum + lot.headcount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const costPerHead = totalAnimals > 0 ? totalExpenses / totalAnimals : 0;
    return { totalAnimals, totalExpenses, costPerHead };
  },
};
