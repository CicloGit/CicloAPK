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
  ExternalMarketplaceApiItemPayload,
  ExternalMarketplaceBridge,
  ExternalMarketplaceItem,
  ExternalMarketplacePortal,
  ExternalMarketplaceStatus,
  MarketplaceListing,
  User,
} from '../types';
import { resolveTenantContext, withTenantFields } from './tenantContext';

const externalMarketplaceCollectionName = 'externalMarketplaceBridges';
const externalMarketplaceItemsCollection = collection(db, 'externalMarketplaceItems');
const marketplaceListingsCollection = collection(db, 'marketplaceListings');

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
  if (normalized === 'TECNICO') return 'Técnico';
  if (normalized === 'INVESTIDOR') return 'Investidor';
  if (normalized === 'ADMINISTRADOR') return 'Administrador';
  if (normalized === 'GESTOR') return 'Gestor';
  return null;
};

const normalizePortal = (value: unknown): ExternalMarketplacePortal | null => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (normalized === 'PRODUTOR') return 'PRODUTOR';
  if (normalized === 'FORNECEDOR') return 'FORNECEDOR';
  if (normalized === 'INTEGRADORA') return 'INTEGRADORA';
  if (normalized === 'OPERADOR') return 'OPERADOR';
  if (normalized === 'LEILOEIRO') return 'LEILOEIRO';
  if (normalized === 'TECNICO') return 'TECNICO';
  if (normalized === 'INVESTIDOR') return 'INVESTIDOR';
  if (normalized === 'GESTOR') return 'GESTOR';
  if (normalized === 'ADMINISTRADOR') return 'ADMINISTRADOR';
  if (normalized === 'GESTOR_DE_TRAFEGO') return 'GESTOR_TRAFEGO';
  return null;
};

const normalizeVisibleRoles = (roles: unknown): Array<User['role']> => {
  if (!Array.isArray(roles)) {
    return [];
  }
  const normalized = roles
    .map((role) => normalizeRole(role))
    .filter((role): role is User['role'] => Boolean(role));
  return Array.from(new Set(normalized));
};

const normalizeVisiblePortals = (portals: unknown): ExternalMarketplacePortal[] => {
  if (!Array.isArray(portals)) {
    return [];
  }
  const normalized = portals
    .map((portal) => normalizePortal(portal))
    .filter((portal): portal is ExternalMarketplacePortal => Boolean(portal));
  return Array.from(new Set(normalized));
};

const normalizeStatus = (value: unknown): ExternalMarketplaceStatus => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'PENDENTE' || normalized === 'ERRO' || normalized === 'INATIVA') {
    return normalized as ExternalMarketplaceStatus;
  }
  return 'ATIVA';
};

const toBridge = (id: string, raw: Record<string, unknown>): ExternalMarketplaceBridge => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  createdByUserId: raw.createdByUserId ? String(raw.createdByUserId) : undefined,
  platformName: String(raw.platformName ?? ''),
  apiBaseUrl: String(raw.apiBaseUrl ?? ''),
  storefrontUrl: String(raw.storefrontUrl ?? ''),
  apiClientId: String(raw.apiClientId ?? ''),
  apiTokenHint: raw.apiTokenHint ? String(raw.apiTokenHint) : undefined,
  status: normalizeStatus(raw.status),
  visibleToRoles: normalizeVisibleRoles(raw.visibleToRoles),
  notes: raw.notes ? String(raw.notes) : undefined,
  lastSyncAt: raw.lastSyncAt ? String(raw.lastSyncAt) : undefined,
  createdAt: raw.createdAt ? String(raw.createdAt) : nowIso(),
  updatedAt: raw.updatedAt ? String(raw.updatedAt) : nowIso(),
});

const toItem = (id: string, raw: Record<string, unknown>): ExternalMarketplaceItem => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  createdByUserId: raw.createdByUserId ? String(raw.createdByUserId) : undefined,
  bridgeId: String(raw.bridgeId ?? ''),
  externalId: String(raw.externalId ?? ''),
  title: String(raw.title ?? ''),
  description: raw.description ? String(raw.description) : undefined,
  segment: String(raw.segment ?? 'GERAL'),
  unit: String(raw.unit ?? 'un'),
  price: Number(raw.price ?? 0),
  stock: Number(raw.stock ?? 0),
  targetPortals: normalizeVisiblePortals(raw.targetPortals),
  sourceUrl: raw.sourceUrl ? String(raw.sourceUrl) : undefined,
  conflictWithInternal: raw.conflictWithInternal === true,
  conflictReason: raw.conflictReason ? String(raw.conflictReason) : undefined,
  createdAt: raw.createdAt ? String(raw.createdAt) : nowIso(),
  updatedAt: raw.updatedAt ? String(raw.updatedAt) : nowIso(),
});

const buildDocId = (tenantId: string): string => `external-marketplace-${tenantId}`;

const toTokenHint = (token: string): string => {
  const normalized = token.trim();
  if (!normalized) {
    return '';
  }
  const suffix = normalized.slice(-4);
  return `****${suffix}`;
};

const normalizeTextKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const roleToPortal = (role?: User['role']): ExternalMarketplacePortal | null => {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'Produtor') return 'PRODUTOR';
  if (normalizedRole === 'Fornecedor') return 'FORNECEDOR';
  if (normalizedRole === 'Integradora') return 'INTEGRADORA';
  if (normalizedRole === 'Operador') return 'OPERADOR';
  if (normalizedRole === 'Leiloeiro') return 'LEILOEIRO';
  if (normalizedRole === 'Técnico') return 'TECNICO';
  if (normalizedRole === 'Investidor') return 'INVESTIDOR';
  if (normalizedRole === 'Gestor') return 'GESTOR';
  if (normalizedRole === 'Administrador') return 'ADMINISTRADOR';
  if (normalizedRole === 'Gestor de Trafego') return 'GESTOR_TRAFEGO';
  return null;
};

const allowedSegmentsByPortal: Record<ExternalMarketplacePortal, string[]> = {
  PRODUTOR: ['INSUMOS', 'UTENSILIOS', 'IMPLEMENTOS', 'SERVICOS', 'LOGISTICA', 'GERAL'],
  FORNECEDOR: ['ATACADO', 'INSUMOS', 'UTENSILIOS', 'EMBALAGENS', 'GERAL'],
  INTEGRADORA: ['ATACADO', 'FRIGORIFICO', 'LOGISTICA', 'SERVICOS', 'GERAL'],
  OPERADOR: ['UTENSILIOS', 'EPI', 'SERVICOS', 'GERAL'],
  LEILOEIRO: ['LOTE', 'TRANSPORTE', 'SERVICOS', 'GERAL'],
  TECNICO: ['INSUMOS', 'SERVICOS', 'LAUDOS', 'GERAL'],
  INVESTIDOR: ['GERAL', 'SERVICOS'],
  GESTOR: ['GERAL', 'INSUMOS', 'UTENSILIOS', 'ATACADO', 'SERVICOS', 'LOGISTICA'],
  ADMINISTRADOR: ['GERAL', 'INSUMOS', 'UTENSILIOS', 'ATACADO', 'SERVICOS', 'LOGISTICA'],
  GESTOR_TRAFEGO: ['LOGISTICA', 'SERVICOS', 'GERAL'],
};

const isSegmentAllowedForPortal = (segment: string, portal: ExternalMarketplacePortal): boolean => {
  const allowed = allowedSegmentsByPortal[portal] ?? ['GERAL'];
  const normalizedSegment = normalizeTextKey(segment).toUpperCase();
  return allowed.includes(normalizedSegment) || allowed.includes('GERAL');
};

const normalizeListingCategory = (raw: Record<string, unknown>): MarketplaceListing['listingCategory'] => {
  const source = String(raw.listingCategory ?? raw.category ?? '').trim().toUpperCase();
  if (source === 'INPUTS_INDUSTRY') {
    return 'INPUTS_INDUSTRY';
  }
  if (source === 'AUCTION_P2P') {
    return 'AUCTION_P2P';
  }
  return 'OUTPUTS_PRODUCER';
};

const readInternalProducedProductKeys = async (): Promise<Set<string>> => {
  const snapshot = await getDocs(query(marketplaceListingsCollection, where('listingCategory', '==', 'OUTPUTS_PRODUCER')));
  const keys = new Set<string>();
  snapshot.docs.forEach((docSnapshot: any) => {
    const raw = docSnapshot.data() as Record<string, unknown>;
    const category = normalizeListingCategory(raw);
    const status = String(raw.status ?? '').trim().toUpperCase();
    if (category !== 'OUTPUTS_PRODUCER' || (status !== 'PUBLISHED' && status !== 'DRAFT')) {
      return;
    }
    const key = normalizeTextKey(String(raw.productName ?? raw.productType ?? ''));
    if (key) {
      keys.add(key);
    }
  });
  return keys;
};

export const externalMarketplaceService = {
  async getBridge(): Promise<ExternalMarketplaceBridge | null> {
    const context = await resolveTenantContext();
    const ref = doc(db, externalMarketplaceCollectionName, buildDocId(context.tenantId));
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return null;
    }
    return toBridge(snapshot.id, snapshot.data() as Record<string, unknown>);
  },

  async listVisibleBridges(viewerRole?: User['role']): Promise<ExternalMarketplaceBridge[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(
      query(collection(db, externalMarketplaceCollectionName), where('tenantId', '==', context.tenantId))
    );
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, bridge: toBridge(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown>; bridge: ExternalMarketplaceBridge }) => {
        if (entry.bridge.status !== 'ATIVA') {
          return false;
        }
        if (!viewerRole || entry.bridge.visibleToRoles.length === 0) {
          return true;
        }
        return entry.bridge.visibleToRoles.includes(viewerRole);
      })
      .map((entry: { bridge: ExternalMarketplaceBridge }) => entry.bridge)
      .sort((a: ExternalMarketplaceBridge, b: ExternalMarketplaceBridge) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async listVisibleItems(viewerRole?: User['role']): Promise<ExternalMarketplaceItem[]> {
    const context = await resolveTenantContext();
    const viewerPortal = roleToPortal(viewerRole);
    const snapshot = await getDocs(
      query(externalMarketplaceItemsCollection, where('tenantId', '==', context.tenantId))
    );
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, item: toItem(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown>; item: ExternalMarketplaceItem }) => {
        if (entry.item.conflictWithInternal) {
          return false;
        }
        if (!viewerPortal) {
          return true;
        }
        if (entry.item.targetPortals.length === 0) {
          return true;
        }
        if (!entry.item.targetPortals.includes(viewerPortal)) {
          return false;
        }
        return isSegmentAllowedForPortal(entry.item.segment, viewerPortal);
      })
      .map((entry: { item: ExternalMarketplaceItem }) => entry.item)
      .sort((a: ExternalMarketplaceItem, b: ExternalMarketplaceItem) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async upsertBridge(payload: {
    platformName: string;
    apiBaseUrl: string;
    storefrontUrl: string;
    apiClientId: string;
    apiToken?: string;
    notes?: string;
    visibleToRoles: Array<User['role']>;
    status?: ExternalMarketplaceStatus;
  }): Promise<ExternalMarketplaceBridge> {
    if (!payload.platformName.trim()) {
      throw new Error('Informe o nome da plataforma externa.');
    }
    if (!payload.apiBaseUrl.trim() || !payload.storefrontUrl.trim()) {
      throw new Error('Informe URL da API e URL da loja externa.');
    }
    if (!payload.apiClientId.trim()) {
      throw new Error('Informe o client id da API externa.');
    }

    const context = await resolveTenantContext();
    const ref = doc(db, externalMarketplaceCollectionName, buildDocId(context.tenantId));
    const snapshot = await getDoc(ref);
    const previous = snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : {};
    const tokenHint = payload.apiToken?.trim() ? toTokenHint(payload.apiToken) : String(previous.apiTokenHint ?? '');
    const createdAt = snapshot.exists() ? String(previous.createdAt ?? nowIso()) : nowIso();
    const updatedAt = nowIso();
    const visibleToRoles = Array.from(new Set(payload.visibleToRoles));

    const normalized = withTenantFields(
      {
        platformName: payload.platformName.trim(),
        apiBaseUrl: payload.apiBaseUrl.trim(),
        storefrontUrl: payload.storefrontUrl.trim(),
        apiClientId: payload.apiClientId.trim(),
        apiTokenHint: tokenHint || null,
        status: payload.status ?? 'ATIVA',
        visibleToRoles,
        notes: payload.notes?.trim() || null,
        lastSyncAt: updatedAt,
        createdAt,
        updatedAt,
        createdAtTs: snapshot.exists() ? previous.createdAtTs ?? serverTimestamp() : serverTimestamp(),
        updatedAtTs: serverTimestamp(),
      },
      context
    );

    await setDoc(ref, normalized, { merge: true });

    return {
      id: ref.id,
      tenantId: context.tenantId,
      createdByUserId: context.userId,
      platformName: normalized.platformName,
      apiBaseUrl: normalized.apiBaseUrl,
      storefrontUrl: normalized.storefrontUrl,
      apiClientId: normalized.apiClientId,
      apiTokenHint: tokenHint || undefined,
      status: normalized.status,
      visibleToRoles,
      notes: normalized.notes ?? undefined,
      lastSyncAt: normalized.lastSyncAt ?? undefined,
      createdAt,
      updatedAt,
    };
  },

  async importItemsFromApi(payload: {
    bridgeId: string;
    items: ExternalMarketplaceApiItemPayload[];
  }): Promise<{ imported: number; blocked: number; blockedItems: Array<{ externalId: string; title: string; reason: string }> }> {
    const normalizedBridgeId = payload.bridgeId.trim();
    if (!normalizedBridgeId) {
      throw new Error('Conexao da loja externa nao encontrada para importar catalogo.');
    }
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Informe itens da API externa para importar.');
    }

    const context = await resolveTenantContext();
    const internalProducedKeys = await readInternalProducedProductKeys();
    let imported = 0;
    let blocked = 0;
    const blockedItems: Array<{ externalId: string; title: string; reason: string }> = [];

    for (const item of payload.items) {
      const title = item.title.trim();
      const externalId = item.externalId.trim();
      const segment = item.segment.trim() || 'GERAL';
      if (!title || !externalId) {
        blocked += 1;
        blockedItems.push({
          externalId: externalId || '-',
          title: title || 'Item sem titulo',
          reason: 'Titulo e externalId obrigatorios.',
        });
        continue;
      }

      const conflictKey = normalizeTextKey(title);
      if (internalProducedKeys.has(conflictKey)) {
        blocked += 1;
        blockedItems.push({
          externalId,
          title,
          reason: 'Conflito com item produzido/publicado no ecossistema interno.',
        });
        continue;
      }

      const targetPortals = item.targetPortals.length > 0 ? item.targetPortals : ['PRODUTOR', 'FORNECEDOR', 'INTEGRADORA'];
      const itemId = `${context.tenantId}-${normalizedBridgeId}-${externalId}`
        .replace(/\s+/g, '-')
        .toLowerCase();
      const updatedAt = nowIso();

      await setDoc(
        doc(db, 'externalMarketplaceItems', itemId),
        withTenantFields(
          {
            bridgeId: normalizedBridgeId,
            externalId,
            title,
            description: item.description?.trim() || null,
            segment,
            unit: item.unit.trim() || 'un',
            price: Number(item.price ?? 0),
            stock: Number(item.stock ?? 0),
            targetPortals,
            sourceUrl: item.sourceUrl?.trim() || null,
            conflictWithInternal: false,
            conflictReason: null,
            createdAt: updatedAt,
            updatedAt,
            createdAtTs: serverTimestamp(),
            updatedAtTs: serverTimestamp(),
          },
          context
        ),
        { merge: true }
      );

      imported += 1;
    }

    return { imported, blocked, blockedItems };
  },

  async deactivateBridge(): Promise<void> {
    const current = await this.getBridge();
    if (!current) {
      return;
    }
    await setDoc(
      doc(db, externalMarketplaceCollectionName, current.id),
      {
        status: 'INATIVA',
        updatedAt: nowIso(),
        updatedAtTs: serverTimestamp(),
      },
      { merge: true }
    );
  },
};
