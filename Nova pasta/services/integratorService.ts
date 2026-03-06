import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { IntegratedProducer, IntegratorMessage, PartnershipOffer } from '../types';
import { networkNeedsService } from './networkNeedsService';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

export type IntegratorApiAuthMode = 'LOGIN' | 'API';
export type IntegratorApiStatus = 'ATIVA' | 'PENDENTE' | 'ERRO';

export interface IntegratorApiLink {
  id: string;
  ownerId: string;
  companyName: string;
  baseUrl: string;
  clientId: string;
  authMode: IntegratorApiAuthMode;
  apiKeyHint?: string;
  status: IntegratorApiStatus;
  lastValidationAt?: string;
  updatedAtLabel?: string;
}

export type IntegratorBiologicalAssetStatus = 'ATIVO' | 'EM_TRANSICAO' | 'COMERCIALIZADO' | 'BLOQUEADO';

export interface IntegratorBiologicalAsset {
  id: string;
  code: string;
  species: string;
  category: string;
  propertyName: string;
  headcount: number;
  averageWeightKg: number;
  estimatedValue: number;
  healthStatus: string;
  status: IntegratorBiologicalAssetStatus;
  lastMovementAt: string;
  notes?: string;
}

export type IntegratorWholesaleClientType = 'ATACADISTA' | 'FRIGORIFICO' | 'OUTRO';
export type IntegratorWholesaleSaleStatus = 'FATURADA' | 'EM_COBRANCA' | 'RECEBIDA';

export interface IntegratorWholesaleSale {
  id: string;
  producerId: string;
  producerName: string;
  clientType: IntegratorWholesaleClientType;
  clientName: string;
  product: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  saleDate: string;
  status: IntegratorWholesaleSaleStatus;
}

export type IntegratorProducerFinanceEntryType = 'ADIANTAMENTO' | 'PAGAMENTO' | 'DEBITO';

export interface IntegratorProducerFinanceEntry {
  id: string;
  producerId: string;
  producerName: string;
  entryType: IntegratorProducerFinanceEntryType;
  amount: number;
  date: string;
  notes?: string;
}

const producersCollection = collection(db, 'integratedProducers');
const offersCollection = collection(db, 'partnershipOffers');
const messagesCollection = collection(db, 'integratorMessages');
const integrationStatusCollection = collection(db, 'integrationStatus');
const biologicalAssetsCollection = collection(db, 'integratorBiologicalAssets');
const wholesaleSalesCollection = collection(db, 'integratorWholesaleSales');
const producerFinanceCollection = collection(db, 'integratorProducerFinanceEntries');

const nowLabel = (): string => new Date().toLocaleString('pt-BR');

const toIntegratedProducer = (id: string, raw: Record<string, unknown>): IntegratedProducer => ({
  id,
  maskedName: String(raw.maskedName ?? ''),
  region: String(raw.region ?? ''),
  productionType: (raw.productionType as IntegratedProducer['productionType']) ?? 'Agricultura',
  status: (raw.status as IntegratedProducer['status']) ?? 'Disponível',
  capacity: String(raw.capacity ?? ''),
  auditScore: Number(raw.auditScore ?? 0),
  lastAuditDate: String(raw.lastAuditDate ?? ''),
});

const toPartnershipOffer = (id: string, raw: Record<string, unknown>): PartnershipOffer => ({
  id,
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  type: (raw.type as PartnershipOffer['type']) ?? 'Compra Garantida',
  status: (raw.status as PartnershipOffer['status']) ?? 'Aberta',
  applicants: Number(raw.applicants ?? 0),
});

const toIntegratorMessage = (id: string, raw: Record<string, unknown>): IntegratorMessage => ({
  id,
  from: String(raw.from ?? ''),
  to: String(raw.to ?? ''),
  content: String(raw.content ?? ''),
  date: String(raw.date ?? ''),
  isUrgent: Boolean(raw.isUrgent),
});

const toIntegratorApiLink = (id: string, raw: Record<string, unknown>): IntegratorApiLink => ({
  id,
  ownerId: String(raw.ownerId ?? ''),
  companyName: String(raw.companyName ?? ''),
  baseUrl: String(raw.baseUrl ?? ''),
  clientId: String(raw.clientId ?? ''),
  authMode: (raw.authMode as IntegratorApiAuthMode) ?? 'API',
  apiKeyHint: raw.apiKeyHint ? String(raw.apiKeyHint) : undefined,
  status: (raw.status as IntegratorApiStatus) ?? 'PENDENTE',
  lastValidationAt: raw.lastValidationAt ? String(raw.lastValidationAt) : undefined,
  updatedAtLabel: raw.updatedAtLabel ? String(raw.updatedAtLabel) : undefined,
});

const toBiologicalAsset = (id: string, raw: Record<string, unknown>): IntegratorBiologicalAsset => ({
  id,
  code: String(raw.code ?? id),
  species: String(raw.species ?? ''),
  category: String(raw.category ?? ''),
  propertyName: String(raw.propertyName ?? ''),
  headcount: Number(raw.headcount ?? 0),
  averageWeightKg: Number(raw.averageWeightKg ?? 0),
  estimatedValue: Number(raw.estimatedValue ?? 0),
  healthStatus: String(raw.healthStatus ?? 'Em monitoramento'),
  status: (raw.status as IntegratorBiologicalAssetStatus) ?? 'ATIVO',
  lastMovementAt: String(raw.lastMovementAt ?? ''),
  notes: raw.notes ? String(raw.notes) : undefined,
});

const toWholesaleSale = (id: string, raw: Record<string, unknown>): IntegratorWholesaleSale => ({
  id,
  producerId: String(raw.producerId ?? ''),
  producerName: String(raw.producerName ?? ''),
  clientType: (() => {
    const clientType = String(raw.clientType ?? '').toUpperCase();
    if (clientType === 'ATACADISTA' || clientType === 'FRIGORIFICO') {
      return clientType as IntegratorWholesaleClientType;
    }
    return 'OUTRO';
  })(),
  clientName: String(raw.clientName ?? ''),
  product: String(raw.product ?? ''),
  quantity: Number(raw.quantity ?? 0),
  unit: String(raw.unit ?? 'un'),
  unitPrice: Number(raw.unitPrice ?? 0),
  totalValue: Number(raw.totalValue ?? 0),
  saleDate: String(raw.saleDate ?? ''),
  status: (() => {
    const status = String(raw.status ?? '').toUpperCase();
    if (status === 'EM_COBRANCA' || status === 'RECEBIDA') {
      return status as IntegratorWholesaleSaleStatus;
    }
    return 'FATURADA';
  })(),
});

const toProducerFinanceEntry = (id: string, raw: Record<string, unknown>): IntegratorProducerFinanceEntry => ({
  id,
  producerId: String(raw.producerId ?? ''),
  producerName: String(raw.producerName ?? ''),
  entryType: (() => {
    const entryType = String(raw.entryType ?? '').toUpperCase();
    if (entryType === 'ADIANTAMENTO' || entryType === 'PAGAMENTO') {
      return entryType as IntegratorProducerFinanceEntryType;
    }
    return 'DEBITO';
  })(),
  amount: Number(raw.amount ?? 0),
  date: String(raw.date ?? ''),
  notes: raw.notes ? String(raw.notes) : undefined,
});

const toNetworkNeedStatus = (status: PartnershipOffer['status']): 'ABERTA' | 'ENCERRADA' =>
  status === 'Aberta' ? 'ABERTA' : 'ENCERRADA';

const validateBaseUrl = (baseUrl: string): string => {
  const normalized = baseUrl.trim().replace(/\/$/, '');
  if (!normalized) {
    throw new Error('Informe a URL base da API da industria.');
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('URL da API invalida.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('A URL da API deve usar http ou https.');
  }

  return normalized;
};

const buildApiLinkDocId = (tenantId: string, ownerId: string): string =>
  `INTEGRATOR_API_${tenantId}_${ownerId}`;

const buildLegacyApiLinkDocId = (ownerId: string): string => `INTEGRATOR_API_${ownerId}`;

const isLegacyOwnerRecord = (raw: Record<string, unknown>, ownerId: string): boolean =>
  String(raw.ownerId ?? '').trim() === ownerId;

export const integratorService = {
  async listProducers(): Promise<IntegratedProducer[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(producersCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, producer: toIntegratedProducer(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { producer: IntegratedProducer }) => row.producer);
  },

  async listOffers(): Promise<PartnershipOffer[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(offersCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, offer: toPartnershipOffer(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { offer: PartnershipOffer }) => row.offer);
  },

  async listMessages(): Promise<IntegratorMessage[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(messagesCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, message: toIntegratorMessage(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { message: IntegratorMessage }) => row.message);
  },

  async listBiologicalAssets(): Promise<IntegratorBiologicalAsset[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(biologicalAssetsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, asset: toBiologicalAsset(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { asset: IntegratorBiologicalAsset }) => row.asset)
      .sort((a: IntegratorBiologicalAsset, b: IntegratorBiologicalAsset) => a.code.localeCompare(b.code));
  },

  async listWholesaleSales(): Promise<IntegratorWholesaleSale[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(wholesaleSalesCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, sale: toWholesaleSale(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { sale: IntegratorWholesaleSale }) => row.sale)
      .sort((a: IntegratorWholesaleSale, b: IntegratorWholesaleSale) => b.saleDate.localeCompare(a.saleDate));
  },

  async createWholesaleSale(
    payload: Omit<IntegratorWholesaleSale, 'id' | 'totalValue'>
  ): Promise<IntegratorWholesaleSale> {
    const context = await resolveTenantContext();
    const newSale: IntegratorWholesaleSale = {
      id: `SALE-${Date.now()}`,
      producerId: payload.producerId.trim(),
      producerName: payload.producerName.trim(),
      clientType: payload.clientType,
      clientName: payload.clientName.trim(),
      product: payload.product.trim(),
      quantity: Number(payload.quantity ?? 0),
      unit: payload.unit.trim() || 'un',
      unitPrice: Number(payload.unitPrice ?? 0),
      totalValue: Number(payload.quantity ?? 0) * Number(payload.unitPrice ?? 0),
      saleDate: payload.saleDate.trim() || new Date().toLocaleDateString('pt-BR'),
      status: payload.status,
    };

    await setDoc(
      doc(db, 'integratorWholesaleSales', newSale.id),
      withTenantFields(
        {
          ...newSale,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return newSale;
  },

  async listProducerFinanceEntries(): Promise<IntegratorProducerFinanceEntry[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(producerFinanceCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, entry: toProducerFinanceEntry(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { entry: IntegratorProducerFinanceEntry }) => row.entry)
      .sort((a: IntegratorProducerFinanceEntry, b: IntegratorProducerFinanceEntry) => b.date.localeCompare(a.date));
  },

  async createProducerFinanceEntry(
    payload: Omit<IntegratorProducerFinanceEntry, 'id'>
  ): Promise<IntegratorProducerFinanceEntry> {
    const context = await resolveTenantContext();
    const newEntry: IntegratorProducerFinanceEntry = {
      id: `FIN-${Date.now()}`,
      producerId: payload.producerId.trim(),
      producerName: payload.producerName.trim(),
      entryType: payload.entryType,
      amount: Number(payload.amount ?? 0),
      date: payload.date.trim() || new Date().toLocaleDateString('pt-BR'),
      notes: payload.notes?.trim() || undefined,
    };

    await setDoc(
      doc(db, 'integratorProducerFinanceEntries', newEntry.id),
      withTenantFields(
        {
          ...newEntry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return newEntry;
  },

  async createMessage(content: string): Promise<IntegratorMessage> {
    const context = await resolveTenantContext();
    const newMessage: IntegratorMessage = {
      id: `MSG-${Date.now()}`,
      from: 'Integradora',
      to: 'All',
      content,
      date: new Date().toLocaleString('pt-BR'),
      isUrgent: false,
    };

    await setDoc(
      doc(db, 'integratorMessages', newMessage.id),
      withTenantFields(
        {
          ...newMessage,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      )
    );

    return newMessage;
  },

  async createDemand(
    data: Pick<PartnershipOffer, 'title' | 'description' | 'type'>,
    options?: { requesterName?: string }
  ): Promise<PartnershipOffer> {
    const context = await resolveTenantContext();
    const newDemand: PartnershipOffer = {
      id: `DEM-${Date.now()}`,
      title: data.title.trim(),
      description: data.description.trim(),
      type: data.type,
      status: 'Aberta',
      applicants: 0,
    };

    await setDoc(
      doc(db, 'partnershipOffers', newDemand.id),
      withTenantFields(
        {
          ...newDemand,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      )
    );

    await networkNeedsService.upsertSourceNeed({
      sourcePortal: 'INTEGRATOR',
      sourceRecordId: newDemand.id,
      title: newDemand.title,
      description: `${newDemand.description} | modelo: ${newDemand.type}`,
      requesterName: options?.requesterName?.trim() || 'Integradora',
      requesterRole: 'Integradora',
      product: newDemand.title,
      visibility: 'NETWORK',
      visibleToRoles: ['Produtor', 'Fornecedor', 'Integradora'],
      status: 'ABERTA',
    });

    return newDemand;
  },

  async updateDemand(
    demandId: string,
    data: Pick<PartnershipOffer, 'title' | 'description' | 'type'>,
    options?: { requesterName?: string }
  ): Promise<PartnershipOffer> {
    const context = await resolveTenantContext();
    const normalizedDemandId = demandId.trim();
    if (!normalizedDemandId) {
      throw new Error('Demanda invalida.');
    }

    const demandRef = doc(db, 'partnershipOffers', normalizedDemandId);
    const beforeUpdate = await getDoc(demandRef);
    if (beforeUpdate.exists() && !hasTenantAccess(beforeUpdate.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para atualizar demanda de outro tenant.');
    }

    await setDoc(
      demandRef,
      withTenantFields(
        {
          title: data.title.trim(),
          description: data.description.trim(),
          type: data.type,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    const snapshot = await getDoc(demandRef);
    const updatedOffer: PartnershipOffer = !snapshot.exists()
      ? {
          id: normalizedDemandId,
          title: data.title.trim(),
          description: data.description.trim(),
          type: data.type,
          status: 'Aberta',
          applicants: 0,
        }
      : toPartnershipOffer(snapshot.id, snapshot.data() as Record<string, unknown>);

    await networkNeedsService.upsertSourceNeed({
      sourcePortal: 'INTEGRATOR',
      sourceRecordId: normalizedDemandId,
      title: updatedOffer.title,
      description: `${updatedOffer.description} | modelo: ${updatedOffer.type}`,
      requesterName: options?.requesterName?.trim() || 'Integradora',
      requesterRole: 'Integradora',
      product: updatedOffer.title,
      visibility: 'NETWORK',
      visibleToRoles: ['Produtor', 'Fornecedor', 'Integradora'],
      status: toNetworkNeedStatus(updatedOffer.status),
    });

    return updatedOffer;
  },

  async deleteDemand(demandId: string): Promise<void> {
    const context = await resolveTenantContext();
    const normalizedDemandId = demandId.trim();
    if (!normalizedDemandId) {
      throw new Error('Demanda invalida.');
    }

    const demandRef = doc(db, 'partnershipOffers', normalizedDemandId);
    const snapshot = await getDoc(demandRef);
    if (snapshot.exists() && !hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para remover demanda de outro tenant.');
    }

    await deleteDoc(demandRef);
    await networkNeedsService.cancelBySource({
      sourcePortal: 'INTEGRATOR',
      sourceRecordId: normalizedDemandId,
    });
  },

  async saveBiologicalAsset(
    payload: Omit<IntegratorBiologicalAsset, 'id'> & { id?: string }
  ): Promise<IntegratorBiologicalAsset> {
    const context = await resolveTenantContext();
    const id = payload.id?.trim() || `BIO-${Date.now()}`;
    const normalized: IntegratorBiologicalAsset = {
      id,
      code: payload.code.trim() || id,
      species: payload.species.trim(),
      category: payload.category.trim(),
      propertyName: payload.propertyName.trim(),
      headcount: Number(payload.headcount ?? 0),
      averageWeightKg: Number(payload.averageWeightKg ?? 0),
      estimatedValue: Number(payload.estimatedValue ?? 0),
      healthStatus: payload.healthStatus.trim() || 'Em monitoramento',
      status: payload.status,
      lastMovementAt: payload.lastMovementAt.trim() || new Date().toLocaleDateString('pt-BR'),
      notes: payload.notes?.trim() || undefined,
    };

    await setDoc(
      doc(db, 'integratorBiologicalAssets', id),
      withTenantFields(
        {
          ...normalized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return normalized;
  },

  async deleteBiologicalAsset(assetId: string): Promise<void> {
    const context = await resolveTenantContext();
    const normalizedAssetId = assetId.trim();
    if (!normalizedAssetId) {
      throw new Error('Ativo biologico invalido.');
    }

    const assetRef = doc(db, 'integratorBiologicalAssets', normalizedAssetId);
    const snapshot = await getDoc(assetRef);
    if (snapshot.exists() && !hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para remover ativo biologico de outro tenant.');
    }

    await deleteDoc(assetRef);
  },

  async updateOfferStatus(offerId: string, status: PartnershipOffer['status']): Promise<void> {
    const context = await resolveTenantContext();
    if (!offerId.trim()) {
      throw new Error('Oferta invalida.');
    }

    const offerRef = doc(db, 'partnershipOffers', offerId);
    const snapshot = await getDoc(offerRef);
    if (snapshot.exists() && !hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para atualizar status de oferta de outro tenant.');
    }

    await setDoc(
      offerRef,
      withTenantFields(
        {
          status,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );
  },

  async getApiLink(ownerId: string): Promise<IntegratorApiLink | null> {
    const normalizedOwnerId = ownerId.trim();
    if (!normalizedOwnerId) {
      return null;
    }

    const context = await resolveTenantContext();
    const scopedDocId = buildApiLinkDocId(context.tenantId, normalizedOwnerId);
    const scopedSnapshot = await getDoc(doc(db, 'integrationStatus', scopedDocId));

    if (scopedSnapshot.exists()) {
      const raw = scopedSnapshot.data() as Record<string, unknown>;
      if (hasTenantAccess(raw, context)) {
        return toIntegratorApiLink(scopedSnapshot.id, raw);
      }
    }

    const legacyDocId = buildLegacyApiLinkDocId(normalizedOwnerId);
    const legacySnapshot = await getDoc(doc(db, 'integrationStatus', legacyDocId));
    if (!legacySnapshot.exists()) {
      return null;
    }

    const legacyRaw = legacySnapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(legacyRaw, context) && !isLegacyOwnerRecord(legacyRaw, normalizedOwnerId)) {
      return null;
    }

    return toIntegratorApiLink(legacySnapshot.id, legacyRaw);
  },

  async saveApiLink(payload: {
    ownerId: string;
    companyName: string;
    baseUrl: string;
    clientId: string;
    authMode: IntegratorApiAuthMode;
    apiKey?: string;
  }): Promise<IntegratorApiLink> {
    const context = await resolveTenantContext();
    const ownerId = payload.ownerId.trim() || context.userId;
    if (!ownerId) {
      throw new Error('Usuario da Integradora nao identificado.');
    }

    const companyName = payload.companyName.trim();
    const clientId = payload.clientId.trim();
    if (!companyName || !clientId) {
      throw new Error('Informe razao social e client id para vincular a API.');
    }

    const baseUrl = validateBaseUrl(payload.baseUrl);
    const apiKeyHint = payload.apiKey?.trim() ? payload.apiKey.trim().slice(-4) : undefined;
    const docId = buildApiLinkDocId(context.tenantId, ownerId);
    const validationMoment = nowLabel();

    const documentPayload = withTenantFields(
      {
        ownerId,
        companyName,
        baseUrl,
        clientId,
        authMode: payload.authMode,
        apiKeyHint: apiKeyHint ?? null,
        status: 'ATIVA' as const,
        type: 'INTEGRATOR_API',
        lastValidationAt: validationMoment,
        updatedAtLabel: validationMoment,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      context
    );

    await setDoc(doc(db, 'integrationStatus', docId), documentPayload, { merge: true });

    return {
      id: docId,
      ownerId,
      companyName,
      baseUrl,
      clientId,
      authMode: payload.authMode,
      apiKeyHint,
      status: 'ATIVA',
      lastValidationAt: validationMoment,
      updatedAtLabel: validationMoment,
    };
  },
};


