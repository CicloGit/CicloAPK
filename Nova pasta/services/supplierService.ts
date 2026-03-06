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
  SupplierExternalProductPayload,
  SupplierFinancialSummary,
  SupplierOrder,
  SupplierPdvConnector,
} from '../types';
import { backendApi, EvidencePayload, PublishListingPayload } from './backendApi';
import { immutableAuditService } from './immutableAuditService';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const supplierOrdersCollection = collection(db, 'supplierOrders');
const supplierFinancialsCollection = collection(db, 'supplierFinancials');
const supplierPdvConnectorCollection = collection(db, 'supplierPdvConnectors');
const supplierPdvImportBatchCollection = collection(db, 'supplierPdvImportBatches');

const getConnectorDocId = (userId: string): string => `connector-${userId.trim()}`;

const maskSecret = (secret: string): string => {
  const normalized = secret.trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= 4) {
    return '*'.repeat(normalized.length);
  }
  return `${'*'.repeat(normalized.length - 4)}${normalized.slice(-4)}`;
};

const toSupplierOrder = (id: string, raw: Record<string, unknown>): SupplierOrder => ({
  id,
  customer: String(raw.customer ?? ''),
  items: Array.isArray(raw.items) ? (raw.items as SupplierOrder['items']) : [],
  totalValue: Number(raw.totalValue ?? 0),
  date: String(raw.date ?? ''),
  status: (raw.status as SupplierOrder['status']) ?? 'PENDENTE',
});

const toSupplierFinancial = (id: string, raw: Record<string, unknown>): SupplierFinancialSummary => ({
  month: String(raw.month ?? id),
  totalSales: Number(raw.totalSales ?? 0),
  platformFees: Number(raw.platformFees ?? 0),
  netPayout: Number(raw.netPayout ?? 0),
  status: (raw.status as SupplierFinancialSummary['status']) ?? 'A PAGAR',
});

const toSupplierConnector = (id: string, raw: Record<string, unknown>): SupplierPdvConnector => ({
  id,
  providerName: String(raw.providerName ?? 'ERP/PDV'),
  baseUrl: String(raw.baseUrl ?? ''),
  apiKeyMasked: String(raw.apiKeyMasked ?? ''),
  routeOffersToPdv: Boolean(raw.routeOffersToPdv),
  autoImportEnabled: Boolean(raw.autoImportEnabled),
  status: (raw.status as SupplierPdvConnector['status']) ?? 'DISCONNECTED',
  lastSyncAt: raw.lastSyncAt ? String(raw.lastSyncAt) : undefined,
  lastSyncStatus: (raw.lastSyncStatus as SupplierPdvConnector['lastSyncStatus']) ?? 'NEVER',
  lastSyncMessage: raw.lastSyncMessage ? String(raw.lastSyncMessage) : undefined,
  immutableAuditHash: raw.immutableAuditHash ? String(raw.immutableAuditHash) : undefined,
});

const normalizeEvidence = (evidences: EvidencePayload[] | undefined): EvidencePayload[] => {
  const list = Array.isArray(evidences) ? evidences : [];
  return list.filter((item) => Boolean(item.storagePath || item.fileHash || item.telemetry));
};

const buildPublishPayload = (
  product: SupplierExternalProductPayload,
  supplierName: string
): PublishListingPayload => ({
  listing: {
    listingCategory: 'INPUTS_INDUSTRY',
    listingMode: 'FIXED_PRICE',
    productName: product.name,
    productType: product.category ?? 'Insumo',
    category: product.category ?? 'Insumo',
    sector: product.sectorHint ?? '',
    productionSector: product.sectorHint ?? '',
    b2bSupplier: supplierName,
    supplierName,
    price: Number(product.price),
    priceModel: 'FIXED',
    unit: product.unit,
    quantityAvailable: Number(product.stock),
    region: product.region ?? '',
    status: 'PUBLISHED',
    localPartnerStoreId: '',
    localStock: 0,
    b2bStock: Number(product.stock),
    deliveryTimeB2B: '3-5 dias',
    externalId: product.externalId,
    externalEvidenceReference: product.evidenceReference,
  },
});

export const supplierService = {
  async listOrders(): Promise<SupplierOrder[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(supplierOrdersCollection, where('tenantId', '==', context.tenantId))); 
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, order: toSupplierOrder(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { order: SupplierOrder }) => row.order);
  },

  async listFinancialSummaries(): Promise<SupplierFinancialSummary[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(supplierFinancialsCollection, where('tenantId', '==', context.tenantId))); 
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, summary: toSupplierFinancial(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { summary: SupplierFinancialSummary }) => row.summary);
  },

  async markOrderShipped(params: {
    orderId: string;
    actor: string;
    evidences: EvidencePayload[];
    proofUrl?: string;
  }): Promise<void> {
    const evidences = normalizeEvidence(params.evidences);
    if (evidences.length === 0) {
      throw new Error('Operacao bloqueada: confirme envio com evidencia digital imutavel.');
    }

    await backendApi.marketConfirmDispatch({
      supplierOrderId: params.orderId,
      evidences,
      telemetry: {
        source: 'supplier-dashboard-manual-dispatch',
        capturedAt: new Date().toISOString(),
      },
    });

    await immutableAuditService.append({
      actor: params.actor,
      action: 'SUPPLIER_ORDER_DISPATCH_CONFIRMED',
      details: `Pedido ${params.orderId} enviado com evidencia digital.`,
      proofUrl: params.proofUrl,
      metadata: { orderId: params.orderId, evidenceCount: evidences.length },
    });
  },

  async getPdvConnector(userId: string): Promise<SupplierPdvConnector | null> {
    if (!userId.trim()) {
      return null;
    }
    const context = await resolveTenantContext();
    const snapshot = await getDoc(doc(db, 'supplierPdvConnectors', getConnectorDocId(userId)));
    if (!snapshot.exists()) {
      return null;
    }
    if (!hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      return null;
    }
    return toSupplierConnector(snapshot.id, snapshot.data() as Record<string, unknown>);
  },

  async connectPdvConnector(params: {
    userId: string;
    actor: string;
    providerName: string;
    baseUrl: string;
    apiKey: string;
    routeOffersToPdv: boolean;
    autoImportEnabled: boolean;
    evidenceReference: string;
  }): Promise<SupplierPdvConnector> {
    if (!params.userId.trim()) {
      throw new Error('Usuario invalido para conectar ERP/PDV.');
    }
    if (!params.providerName.trim() || !params.baseUrl.trim() || !params.apiKey.trim()) {
      throw new Error('Preencha provedor, URL e credencial de integracao.');
    }
    if (!params.evidenceReference.trim()) {
      throw new Error('A conexao exige evidencia digital.');
    }

    const context = await resolveTenantContext();
    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'SUPPLIER_PDV_CONNECT',
      details: `Conector ${params.providerName} conectado ao Painel do Fornecedor ERP.`,
      proofUrl: params.evidenceReference,
      metadata: {
        providerName: params.providerName,
        baseUrl: params.baseUrl,
        routeOffersToPdv: params.routeOffersToPdv,
        autoImportEnabled: params.autoImportEnabled,
      },
    });

    const connectorId = getConnectorDocId(params.userId);
    const connector: SupplierPdvConnector = {
      id: connectorId,
      providerName: params.providerName.trim(),
      baseUrl: params.baseUrl.trim(),
      apiKeyMasked: maskSecret(params.apiKey),
      routeOffersToPdv: params.routeOffersToPdv,
      autoImportEnabled: params.autoImportEnabled,
      status: 'CONNECTED',
      lastSyncStatus: 'NEVER',
      immutableAuditHash: audit.hash,
    };

    await setDoc(
      doc(db, 'supplierPdvConnectors', connectorId),
      withTenantFields(
        {
          ...connector,
          userId: params.userId,
          evidenceReference: params.evidenceReference,
          immutable: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return connector;
  },

  async disconnectPdvConnector(params: {
    userId: string;
    actor: string;
    evidenceReference: string;
  }): Promise<SupplierPdvConnector> {
    if (!params.userId.trim()) {
      throw new Error('Usuario invalido para desconectar ERP/PDV.');
    }
    if (!params.evidenceReference.trim()) {
      throw new Error('Informe evidencia digital para desconectar.');
    }

    const context = await resolveTenantContext();
    const connectorId = getConnectorDocId(params.userId);
    const snapshot = await getDoc(doc(db, 'supplierPdvConnectors', connectorId));
    if (snapshot.exists() && !hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para desconectar conector de outro tenant.');
    }
    const previous = snapshot.exists() ? toSupplierConnector(snapshot.id, snapshot.data() as Record<string, unknown>) : null;

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'SUPPLIER_PDV_DISCONNECT',
      details: `Conector ${previous?.providerName ?? 'ERP/PDV'} desconectado do Painel do Fornecedor ERP.`,
      proofUrl: params.evidenceReference,
      metadata: { connectorId },
    });

    const connector: SupplierPdvConnector = {
      id: connectorId,
      providerName: previous?.providerName ?? 'ERP/PDV',
      baseUrl: previous?.baseUrl ?? '',
      apiKeyMasked: previous?.apiKeyMasked ?? '',
      routeOffersToPdv: false,
      autoImportEnabled: false,
      status: 'DISCONNECTED',
      lastSyncStatus: previous?.lastSyncStatus ?? 'NEVER',
      lastSyncAt: previous?.lastSyncAt,
      lastSyncMessage: previous?.lastSyncMessage,
      immutableAuditHash: audit.hash,
    };

    await setDoc(
      doc(db, 'supplierPdvConnectors', connectorId),
      withTenantFields(
        {
          ...connector,
          userId: params.userId,
          immutable: true,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return connector;
  },

  async importProductsFromExternalErp(params: {
    userId: string;
    actor: string;
    supplierName: string;
    evidenceReference: string;
    products: SupplierExternalProductPayload[];
  }): Promise<{ imported: number; failed: number; errors: string[]; listingIds: string[] }> {
    const context = await resolveTenantContext();
    if (!params.userId.trim()) {
      throw new Error('Usuario invalido para importar produtos.');
    }
    if (!params.evidenceReference.trim()) {
      throw new Error('A importacao exige evidencia digital.');
    }
    if (!Array.isArray(params.products) || params.products.length === 0) {
      throw new Error('Nao ha produtos no lote de importacao.');
    }

    const connector = await this.getPdvConnector(params.userId);
    if (!connector || connector.status !== 'CONNECTED') {
      throw new Error('Conecte o ERP/PDV antes de importar produtos.');
    }

    const validProducts = params.products.filter(
      (item) =>
        item.name.trim().length > 0 &&
        item.unit.trim().length > 0 &&
        Number.isFinite(item.price) &&
        Number.isFinite(item.stock) &&
        item.evidenceReference.trim().length > 0
    );
    if (validProducts.length === 0) {
      throw new Error('Todos os produtos do lote estao invalidos para importacao.');
    }

    const listingIds: string[] = [];
    const errors: string[] = [];

    for (const product of validProducts) {
      try {
        const result = await backendApi.marketPublishListing(buildPublishPayload(product, params.supplierName || params.actor));
        listingIds.push(result.listingId);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'falha desconhecida';
        errors.push(`${product.externalId || product.name}: ${reason}`);
      }
    }

    const imported = listingIds.length;
    const failed = Math.max(validProducts.length - imported, 0);
    const syncStatus: SupplierPdvConnector['lastSyncStatus'] = failed > 0 ? 'FAILED' : 'SUCCESS';
    const syncMessage =
      failed > 0
        ? `Importacao parcial: ${imported} publicados e ${failed} com falha.`
        : `Importacao concluida: ${imported} produtos publicados.`;

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'SUPPLIER_PDV_BATCH_IMPORT',
      details: syncMessage,
      proofUrl: params.evidenceReference,
      metadata: {
        imported,
        failed,
        listingIds,
      },
    });

    await addDoc(
      supplierPdvImportBatchCollection,
      withTenantFields(
        {
          userId: params.userId,
          actor: params.actor,
          imported,
          failed,
          errors,
          listingIds,
          immutableAuditHash: audit.hash,
          immutable: true,
          evidenceReference: params.evidenceReference,
          createdAt: serverTimestamp(),
        },
        context
      )
    );

    await setDoc(
      doc(db, 'supplierPdvConnectors', getConnectorDocId(params.userId)),
      withTenantFields(
        {
          userId: params.userId,
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: syncStatus,
          lastSyncMessage: syncMessage,
          immutableAuditHash: audit.hash,
          immutable: true,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return { imported, failed, errors, listingIds };
  },

  async listConnectorHistory(userId: string): Promise<Array<{
    id: string;
    imported: number;
    failed: number;
    createdAt: string;
    immutableAuditHash?: string;
  }>> {
    if (!userId.trim()) {
      return [];
    }
    const context = await resolveTenantContext();

    const snapshot = await getDocs(query(supplierPdvImportBatchCollection, where('userId', '==', userId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        if (!hasTenantAccess(raw, context)) {
          return null;
        }
        const createdAt = typeof (raw.createdAt as { toDate?: () => Date })?.toDate === 'function'
          ? (raw.createdAt as { toDate: () => Date }).toDate().toISOString()
          : String(raw.createdAt ?? '');
        return {
          id: docSnapshot.id,
          imported: Number(raw.imported ?? 0),
          failed: Number(raw.failed ?? 0),
          createdAt,
          immutableAuditHash: raw.immutableAuditHash ? String(raw.immutableAuditHash) : undefined,
        };
      })
      .filter((item: {
        id: string;
        imported: number;
        failed: number;
        createdAt: string;
        immutableAuditHash?: string;
      } | null): item is {
        id: string;
        imported: number;
        failed: number;
        createdAt: string;
        immutableAuditHash?: string;
      } => Boolean(item))
      .sort((a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt));
  },
};



