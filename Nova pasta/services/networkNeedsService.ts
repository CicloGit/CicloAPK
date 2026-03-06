import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { NetworkNeed, NetworkNeedStatus, User } from '../types';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const networkNeedsCollection = collection(db, 'networkNeeds');

const nowIso = (): string => new Date().toISOString();

const normalizeRole = (value: unknown): User['role'] | null => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (normalized === 'PRODUTOR') return 'Produtor';
  if (normalized === 'FORNECEDOR') return 'Fornecedor';
  if (normalized === 'INTEGRADORA') return 'Integradora';
  if (normalized === 'OPERADOR') return 'Operador';
  if (normalized === 'LEILOEIRO') return 'Leiloeiro';
  if (normalized === 'GESTOR_DE_TRAFEGO') return 'Gestor de Trafego';
  if (normalized === 'TECNICO') return 'T\u00e9cnico';
  if (normalized === 'INVESTIDOR') return 'Investidor';
  if (normalized === 'ADMINISTRADOR') return 'Administrador';
  if (normalized === 'GESTOR') return 'Gestor';
  return null;
};

const normalizeNeedStatus = (value: unknown): NetworkNeedStatus => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'EM_ATENDIMENTO' || normalized === 'CONTRATADA' || normalized === 'ENCERRADA' || normalized === 'CANCELADA') {
    return normalized as NetworkNeedStatus;
  }
  return 'ABERTA';
};

const normalizeVisibleRoles = (roles: unknown): Array<User['role']> => {
  if (!Array.isArray(roles)) {
    return [];
  }
  const normalized = roles
    .map((entry) => normalizeRole(entry))
    .filter((entry): entry is User['role'] => Boolean(entry));
  return Array.from(new Set(normalized));
};

const getDefaultVisibleRoles = (sourcePortal: NetworkNeed['sourcePortal']): Array<User['role']> => {
  if (sourcePortal === 'INTEGRATOR') {
    return ['Produtor', 'Fornecedor', 'Integradora'];
  }
  if (sourcePortal === 'SUPPLIER') {
    return ['Produtor', 'Integradora', 'Fornecedor'];
  }
  if (sourcePortal === 'AUCTIONEER') {
    return ['Produtor', 'Integradora', 'Leiloeiro'];
  }
  if (sourcePortal === 'OPERATOR') {
    return ['Produtor', 'Operador', 'Integradora'];
  }
  return ['Produtor', 'Fornecedor', 'Integradora'];
};

const toNetworkNeed = (id: string, raw: Record<string, unknown>): NetworkNeed => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  createdByUserId: raw.createdByUserId ? String(raw.createdByUserId) : undefined,
  sourcePortal: (() => {
    const source = String(raw.sourcePortal ?? '').trim().toUpperCase();
    if (source === 'INTEGRATOR' || source === 'SUPPLIER' || source === 'AUCTIONEER' || source === 'OPERATOR') {
      return source as NetworkNeed['sourcePortal'];
    }
    return 'PRODUCER';
  })(),
  sourceRecordId: raw.sourceRecordId ? String(raw.sourceRecordId) : undefined,
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  product: raw.product ? String(raw.product) : undefined,
  quantity: raw.quantity ? String(raw.quantity) : undefined,
  region: raw.region ? String(raw.region) : undefined,
  requesterName: String(raw.requesterName ?? ''),
  requesterRole: normalizeRole(raw.requesterRole) ?? 'Produtor',
  targetProducerId: raw.targetProducerId ? String(raw.targetProducerId) : undefined,
  targetProducerName: raw.targetProducerName ? String(raw.targetProducerName) : undefined,
  visibleToRoles: normalizeVisibleRoles(raw.visibleToRoles),
  visibility: String(raw.visibility ?? '').trim().toUpperCase() === 'NETWORK' ? 'NETWORK' : 'TENANT',
  status: normalizeNeedStatus(raw.status),
  createdAt: raw.createdAt ? String(raw.createdAt) : nowIso(),
  updatedAt: raw.updatedAt ? String(raw.updatedAt) : nowIso(),
});

const canReadNeed = (need: NetworkNeed, raw: Record<string, unknown>, context: { tenantId: string; userId: string }, viewerRole?: User['role']): boolean => {
  const hasSameTenantAccess = hasTenantAccess(raw, context);
  const isNetworkVisible = need.visibility === 'NETWORK';
  if (!hasSameTenantAccess && !isNetworkVisible) {
    return false;
  }
  if (need.createdByUserId && need.createdByUserId === context.userId) {
    return true;
  }
  if (!viewerRole) {
    return true;
  }
  if ((need.visibleToRoles ?? []).length === 0) {
    return true;
  }
  return need.visibleToRoles.includes(viewerRole);
};

const findBySource = async (
  context: { tenantId: string },
  sourcePortal: NetworkNeed['sourcePortal'],
  sourceRecordId: string
): Promise<NetworkNeed | null> => {
  const snapshot = await getDocs(
    query(
      networkNeedsCollection,
      where('tenantId', '==', context.tenantId),
      where('sourcePortal', '==', sourcePortal),
      where('sourceRecordId', '==', sourceRecordId.trim())
    )
  );
  const docRow = snapshot.docs[0];
  if (!docRow) {
    return null;
  }
  return toNetworkNeed(docRow.id, docRow.data() as Record<string, unknown>);
};

export const networkNeedsService = {
  async listVisibleNeeds(viewerRole?: User['role']): Promise<NetworkNeed[]> {
    const context = await resolveTenantContext();
    const [tenantSnapshot, networkSnapshot] = await Promise.all([
      getDocs(query(networkNeedsCollection, where('tenantId', '==', context.tenantId))),
      getDocs(query(networkNeedsCollection, where('visibility', '==', 'NETWORK'))),
    ]);

    const deduped = new Map<string, { raw: Record<string, unknown>; need: NetworkNeed }>();
    [tenantSnapshot, networkSnapshot].forEach((snapshot) => {
      snapshot.docs.forEach((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        deduped.set(docSnapshot.id, { raw, need: toNetworkNeed(docSnapshot.id, raw) });
      });
    });

    return Array.from(deduped.values())
      .filter((row: { raw: Record<string, unknown>; need: NetworkNeed }) =>
        canReadNeed(row.need, row.raw, context, viewerRole)
      )
      .map((row: { need: NetworkNeed }) => row.need)
      .sort((a: NetworkNeed, b: NetworkNeed) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async publishNeed(payload: {
    sourcePortal: NetworkNeed['sourcePortal'];
    sourceRecordId?: string;
    title: string;
    description: string;
    requesterName: string;
    requesterRole: User['role'];
    product?: string;
    quantity?: string;
    region?: string;
    targetProducerId?: string;
    targetProducerName?: string;
    visibility?: NetworkNeed['visibility'];
    visibleToRoles?: Array<User['role']>;
    status?: NetworkNeedStatus;
  }): Promise<NetworkNeed> {
    if (!payload.title.trim() || !payload.description.trim()) {
      throw new Error('Titulo e descricao sao obrigatorios para publicar necessidade na rede.');
    }

    const context = await resolveTenantContext();
    const createdAt = nowIso();
    const visibleToRoles =
      payload.visibleToRoles && payload.visibleToRoles.length > 0
        ? Array.from(new Set(payload.visibleToRoles))
        : getDefaultVisibleRoles(payload.sourcePortal);

    const record = withTenantFields(
      {
        sourcePortal: payload.sourcePortal,
        sourceRecordId: payload.sourceRecordId?.trim() || null,
        title: payload.title.trim(),
        description: payload.description.trim(),
        product: payload.product?.trim() || null,
        quantity: payload.quantity?.trim() || null,
        region: payload.region?.trim() || null,
        requesterName: payload.requesterName.trim(),
        requesterRole: payload.requesterRole,
        targetProducerId: payload.targetProducerId?.trim() || null,
        targetProducerName: payload.targetProducerName?.trim() || null,
        visibleToRoles,
        visibility: payload.visibility === 'NETWORK' ? 'NETWORK' : 'TENANT',
        status: payload.status ?? 'ABERTA',
        createdAt,
        updatedAt: createdAt,
        createdAtTs: serverTimestamp(),
        updatedAtTs: serverTimestamp(),
      },
      context
    );

    const created = await addDoc(networkNeedsCollection, record);
    return {
      id: created.id,
      tenantId: context.tenantId,
      createdByUserId: context.userId,
      sourcePortal: payload.sourcePortal,
      sourceRecordId: payload.sourceRecordId?.trim() || undefined,
      title: payload.title.trim(),
      description: payload.description.trim(),
      product: payload.product?.trim() || undefined,
      quantity: payload.quantity?.trim() || undefined,
      region: payload.region?.trim() || undefined,
      requesterName: payload.requesterName.trim(),
      requesterRole: payload.requesterRole,
      targetProducerId: payload.targetProducerId?.trim() || undefined,
      targetProducerName: payload.targetProducerName?.trim() || undefined,
      visibleToRoles,
      visibility: payload.visibility === 'NETWORK' ? 'NETWORK' : 'TENANT',
      status: payload.status ?? 'ABERTA',
      createdAt,
      updatedAt: createdAt,
    };
  },

  async upsertSourceNeed(payload: {
    sourcePortal: NetworkNeed['sourcePortal'];
    sourceRecordId: string;
    title: string;
    description: string;
    requesterName: string;
    requesterRole: User['role'];
    product?: string;
    quantity?: string;
    region?: string;
    targetProducerId?: string;
    targetProducerName?: string;
    visibility?: NetworkNeed['visibility'];
    visibleToRoles?: Array<User['role']>;
    status?: NetworkNeedStatus;
  }): Promise<NetworkNeed> {
    const normalizedSourceRecordId = payload.sourceRecordId.trim();
    if (!normalizedSourceRecordId) {
      throw new Error('Registro de origem obrigatorio para sincronizacao de necessidade.');
    }

    const context = await resolveTenantContext();
    const existing = await findBySource(context, payload.sourcePortal, normalizedSourceRecordId);
    if (!existing) {
      return this.publishNeed({
        ...payload,
        sourceRecordId: normalizedSourceRecordId,
      });
    }

    const updatedAt = nowIso();
    const ref = doc(db, 'networkNeeds', existing.id);
    const visibleToRoles =
      payload.visibleToRoles && payload.visibleToRoles.length > 0
        ? Array.from(new Set(payload.visibleToRoles))
        : existing.visibleToRoles.length > 0
          ? existing.visibleToRoles
          : getDefaultVisibleRoles(payload.sourcePortal);

    await updateDoc(ref, {
      title: payload.title.trim(),
      description: payload.description.trim(),
      product: payload.product?.trim() || null,
      quantity: payload.quantity?.trim() || null,
      region: payload.region?.trim() || null,
      requesterName: payload.requesterName.trim(),
      requesterRole: payload.requesterRole,
      targetProducerId: payload.targetProducerId?.trim() || null,
      targetProducerName: payload.targetProducerName?.trim() || null,
      visibility: payload.visibility === 'NETWORK' ? 'NETWORK' : existing.visibility,
      visibleToRoles,
      status: payload.status ?? existing.status,
      updatedAt,
      updatedAtTs: serverTimestamp(),
    });

    return {
      ...existing,
      title: payload.title.trim(),
      description: payload.description.trim(),
      product: payload.product?.trim() || undefined,
      quantity: payload.quantity?.trim() || undefined,
      region: payload.region?.trim() || undefined,
      requesterName: payload.requesterName.trim(),
      requesterRole: payload.requesterRole,
      targetProducerId: payload.targetProducerId?.trim() || undefined,
      targetProducerName: payload.targetProducerName?.trim() || undefined,
      visibleToRoles,
      visibility: payload.visibility === 'NETWORK' ? 'NETWORK' : existing.visibility,
      status: payload.status ?? existing.status,
      updatedAt,
    };
  },

  async updateNeedStatus(params: { needId: string; status: NetworkNeedStatus }): Promise<void> {
    const context = await resolveTenantContext();
    const normalizedNeedId = params.needId.trim();
    if (!normalizedNeedId) {
      throw new Error('Necessidade invalida.');
    }

    const needRef = doc(db, 'networkNeeds', normalizedNeedId);
    const snapshot = await getDoc(needRef);
    if (!snapshot.exists()) {
      throw new Error('Necessidade nao encontrada.');
    }

    if (!hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para alterar necessidade de outro tenant.');
    }

    await updateDoc(needRef, {
      status: params.status,
      updatedAt: nowIso(),
      updatedAtTs: serverTimestamp(),
    });
  },

  async cancelBySource(params: { sourcePortal: NetworkNeed['sourcePortal']; sourceRecordId: string }): Promise<void> {
    const context = await resolveTenantContext();
    const existing = await findBySource(context, params.sourcePortal, params.sourceRecordId);
    if (!existing) {
      return;
    }

    await updateDoc(doc(db, 'networkNeeds', existing.id), {
      status: 'CANCELADA',
      updatedAt: nowIso(),
      updatedAtTs: serverTimestamp(),
    });
  },
};

