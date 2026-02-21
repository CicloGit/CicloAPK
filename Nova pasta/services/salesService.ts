import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuditChain } from '../lib/auditChain';
import { parseDateToTimestamp } from './dateUtils';
import {
  AuditEvent,
  ConsumerMarketChannel,
  ProducerFiscalStatus,
  ProducerPdvSale,
  ProducerSaleEvidence,
  ProducerSaleEvidenceType,
  ProducerSaleSettlementMode,
  ProducerSaleSourceType,
  SalesOffer,
} from '../types';

const salesOfferCollection = collection(db, 'salesOffers');
const producerPdvSalesCollection = collection(db, 'producerPdvSales');
const auditCollection = collection(db, 'auditEvents');

const nowLabel = (): string => new Date().toLocaleString('pt-BR');
const todayDateLabel = (): string => new Date().toLocaleDateString('pt-BR');
const sanitizeNumber = (value: number): number => (Number.isFinite(value) ? Number(value.toFixed(2)) : 0);
const generateFiscalDocumentNumber = (): string => {
  const year = new Date().getFullYear();
  const suffix = Date.now().toString().slice(-8);
  return `NF-${year}-${suffix}`;
};

const toSalesOffer = (id: string, raw: Record<string, unknown>): SalesOffer => ({
  id,
  product: String(raw.product ?? ''),
  quantity: String(raw.quantity ?? ''),
  price: Number(raw.price ?? 0),
  channel: (raw.channel as ConsumerMarketChannel) ?? 'WHOLESALE_DIRECT',
  listingCategory: (raw.listingCategory as SalesOffer['listingCategory']) ?? 'OUTPUTS_PRODUCER',
  listingMode: (raw.listingMode as SalesOffer['listingMode']) ?? 'FIXED_PRICE',
  offerType: (raw.offerType as SalesOffer['offerType']) ?? 'PRODUTO',
  description: raw.description ? String(raw.description) : undefined,
  location: raw.location ? String(raw.location) : undefined,
  auctionEndAt: raw.auctionEndAt ? String(raw.auctionEndAt) : undefined,
  minimumBid: raw.minimumBid ? Number(raw.minimumBid) : undefined,
  status: (raw.status as SalesOffer['status']) ?? 'ATIVA',
  date: String(raw.date ?? todayDateLabel()),
});

const normalizeEvidenceType = (value: unknown): ProducerSaleEvidenceType => {
  const normalized = String(value ?? '').toUpperCase();
  if (
    normalized === 'QR_CODE' ||
    normalized === 'SCALE_QR' ||
    normalized === 'PHOTO' ||
    normalized === 'VIDEO' ||
    normalized === 'SALE_AUTHORIZATION' ||
    normalized === 'VEHICLE'
  ) {
    return normalized as ProducerSaleEvidenceType;
  }
  return 'QR_CODE';
};

const toSaleEvidence = (raw: unknown): ProducerSaleEvidence => {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    id: String(value.id ?? `EVD-${Date.now()}`),
    type: normalizeEvidenceType(value.type),
    createdAt: String(value.createdAt ?? nowLabel()),
    reference: value.reference ? String(value.reference) : undefined,
    url: value.url ? String(value.url) : undefined,
    hash: value.hash ? String(value.hash) : undefined,
    notes: value.notes ? String(value.notes) : undefined,
  };
};

const normalizeSourceType = (value: unknown): ProducerSaleSourceType => {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'ANIMAL_UNIT_LOT' || normalized === 'ANIMAL_WEIGHT' || normalized === 'CROP' || normalized === 'ASSET') {
    return normalized as ProducerSaleSourceType;
  }
  return 'CROP';
};

const normalizeSettlementMode = (value: unknown): ProducerSaleSettlementMode => {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'DIRECT_SALE' || normalized === 'AUCTION_REMESSA') {
    return normalized as ProducerSaleSettlementMode;
  }
  return 'DIRECT_SALE';
};

const normalizeFiscalStatus = (value: unknown): ProducerFiscalStatus => {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized === 'NF_EMITIDA' || normalized === 'AGUARDANDO_FINALIZACAO_LEILAO' || normalized === 'AGUARDANDO_EMISSAO') {
    return normalized as ProducerFiscalStatus;
  }
  return 'AGUARDANDO_EMISSAO';
};

const toPdvSale = (id: string, raw: Record<string, unknown>): ProducerPdvSale => ({
  id,
  createdAt: String(raw.createdAt ?? nowLabel()),
  sourceType: normalizeSourceType(raw.sourceType),
  settlementMode: normalizeSettlementMode(raw.settlementMode),
  fiscalStatus: normalizeFiscalStatus(raw.fiscalStatus),
  buyer: String(raw.buyer ?? ''),
  description: String(raw.description ?? ''),
  unitPrice: Number(raw.unitPrice ?? 0),
  totalValue: Number(raw.totalValue ?? 0),
  actor: String(raw.actor ?? 'Produtor'),
  lotId: raw.lotId ? String(raw.lotId) : undefined,
  animalIds: Array.isArray(raw.animalIds) ? (raw.animalIds as string[]).map((item) => String(item)) : undefined,
  headcount: raw.headcount !== undefined && raw.headcount !== null ? Number(raw.headcount) : undefined,
  totalWeightKg: raw.totalWeightKg !== undefined && raw.totalWeightKg !== null ? Number(raw.totalWeightKg) : undefined,
  fieldPlot: raw.fieldPlot ? String(raw.fieldPlot) : undefined,
  boxes: raw.boxes !== undefined && raw.boxes !== null ? Number(raw.boxes) : undefined,
  assetItemId: raw.assetItemId ? String(raw.assetItemId) : undefined,
  assetName: raw.assetName ? String(raw.assetName) : undefined,
  saleAuthorizationCode: raw.saleAuthorizationCode ? String(raw.saleAuthorizationCode) : undefined,
  vehiclePlate: raw.vehiclePlate ? String(raw.vehiclePlate) : undefined,
  scaleQrCode: raw.scaleQrCode ? String(raw.scaleQrCode) : undefined,
  deferFiscalEmission: Boolean(raw.deferFiscalEmission),
  auctionFinishedAt: raw.auctionFinishedAt ? String(raw.auctionFinishedAt) : undefined,
  fiscalDocumentNumber: raw.fiscalDocumentNumber ? String(raw.fiscalDocumentNumber) : undefined,
  fiscalIssuedAt: raw.fiscalIssuedAt ? String(raw.fiscalIssuedAt) : undefined,
  evidences: Array.isArray(raw.evidences) ? raw.evidences.map((item) => toSaleEvidence(item)) : [],
  auditHash: raw.auditHash ? String(raw.auditHash) : undefined,
});

const toAuditEvent = (id: string, raw: Record<string, unknown>): AuditEvent => ({
  id,
  timestamp: String(raw.timestamp ?? new Date().toISOString()),
  actor: String(raw.actor ?? ''),
  action: String(raw.action ?? ''),
  details: String(raw.details ?? ''),
  geolocation: String(raw.geolocation ?? ''),
  hash: String(raw.hash ?? ''),
  verified: Boolean(raw.verified),
  proofUrl: raw.proofUrl ? String(raw.proofUrl) : undefined,
});

async function getLatestAuditEvent(): Promise<AuditEvent | null> {
  const auditSnapshot = await getDocs(query(auditCollection, orderBy('createdAt', 'desc'), limit(1)));
  if (auditSnapshot.empty) {
    return null;
  }
  const docSnapshot = auditSnapshot.docs[0];
  return toAuditEvent(docSnapshot.id, docSnapshot.data() as Record<string, unknown>);
}

async function appendAuditEvent(payload: {
  actor: string;
  action: string;
  details: string;
  proofUrl?: string;
}): Promise<AuditEvent> {
  const latestAuditEvent = await getLatestAuditEvent();
  const previousHash = latestAuditEvent ? latestAuditEvent.hash : '0'.repeat(64);
  const newAuditEvent = await AuditChain.createAuditEvent(
    {
      actor: payload.actor,
      action: payload.action,
      details: payload.details,
      geolocation: '-15.123, -47.654',
      verified: true,
      proofUrl: payload.proofUrl,
    },
    previousHash
  );

  await setDoc(
    doc(db, 'auditEvents', newAuditEvent.id),
    {
      ...newAuditEvent,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return newAuditEvent;
}

const assertPdvRules = (payload: CreatePdvSalePayload) => {
  if (!payload.buyer.trim()) {
    throw new Error('Informe o comprador para registrar a venda.');
  }
  if (!payload.description.trim()) {
    throw new Error('Informe a descricao comercial da operacao.');
  }
  if (!Number.isFinite(payload.unitPrice) || payload.unitPrice <= 0) {
    throw new Error('Informe um preco unitario valido.');
  }

  if (payload.sourceType === 'ANIMAL_UNIT_LOT') {
    const hasLotRef = Boolean(payload.lotId?.trim());
    const hasAnimalList = Array.isArray(payload.animalIds) && payload.animalIds.length > 0;
    if (!hasLotRef && !hasAnimalList) {
      throw new Error('Venda animal por unidade exige lote ou lista de brincos.');
    }
  }

  if (payload.sourceType === 'ANIMAL_WEIGHT' && (!payload.totalWeightKg || payload.totalWeightKg <= 0)) {
    throw new Error('Venda animal por peso exige peso total em kg.');
  }

  if (payload.sourceType === 'CROP') {
    const hasWeightOrBoxes = (payload.totalWeightKg ?? 0) > 0 || (payload.boxes ?? 0) > 0;
    if (!payload.fieldPlot?.trim() || !hasWeightOrBoxes) {
      throw new Error('Venda de plantacao exige talhao/pasto e peso ou caixas.');
    }
    if (!payload.scaleQrCode?.trim() || !payload.vehiclePlate?.trim() || !payload.saleAuthorizationCode?.trim()) {
      throw new Error('Para graos/plantacao informe QR da balanca, veiculo e autorizacao de venda.');
    }
  }

  if (payload.sourceType === 'ASSET' && !payload.assetItemId?.trim()) {
    throw new Error('Venda de bem patrimonial exige identificacao do item no estoque.');
  }
};

const computeTotalValue = (payload: CreatePdvSalePayload): number => {
  if (payload.sourceType === 'ANIMAL_UNIT_LOT') {
    const headcount = payload.headcount ?? payload.animalIds?.length ?? 0;
    return sanitizeNumber(payload.unitPrice * Math.max(headcount, 1));
  }
  if (payload.sourceType === 'ANIMAL_WEIGHT') {
    return sanitizeNumber(payload.unitPrice * Math.max(payload.totalWeightKg ?? 0, 0));
  }
  if (payload.sourceType === 'CROP') {
    const volume = (payload.totalWeightKg ?? 0) + (payload.boxes ?? 0);
    return sanitizeNumber(payload.unitPrice * Math.max(volume, 1));
  }
  return sanitizeNumber(payload.unitPrice);
};

interface CreatePdvSalePayload {
  sourceType: ProducerSaleSourceType;
  settlementMode: ProducerSaleSettlementMode;
  buyer: string;
  description: string;
  unitPrice: number;
  actor: string;
  lotId?: string;
  animalIds?: string[];
  headcount?: number;
  totalWeightKg?: number;
  fieldPlot?: string;
  boxes?: number;
  assetItemId?: string;
  assetName?: string;
  saleAuthorizationCode?: string;
  vehiclePlate?: string;
  scaleQrCode?: string;
  deferFiscalEmission?: boolean;
  evidences?: ProducerSaleEvidence[];
}

export const salesService = {
  async listOffers(): Promise<SalesOffer[]> {
    const snapshot = await getDocs(salesOfferCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toSalesOffer(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: SalesOffer, b: SalesOffer) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async createOffer(
    data: Pick<SalesOffer, 'product' | 'quantity' | 'price'> &
      Partial<
        Pick<
          SalesOffer,
          'channel' | 'offerType' | 'listingMode' | 'description' | 'location' | 'auctionEndAt' | 'minimumBid' | 'listingCategory'
        >
      >
  ): Promise<SalesOffer> {
    const listingMode = data.listingMode ?? 'FIXED_PRICE';
    const inferredCategory = listingMode === 'AUCTION' ? 'AUCTION_P2P' : 'OUTPUTS_PRODUCER';

    const newOffer: SalesOffer = {
      id: `SO-${Date.now()}`,
      product: data.product,
      quantity: data.quantity,
      price: data.price,
      channel: listingMode === 'AUCTION' ? undefined : (data.channel ?? 'WHOLESALE_DIRECT'),
      listingMode,
      listingCategory: data.listingCategory ?? inferredCategory,
      offerType: data.offerType ?? 'PRODUTO',
      description: data.description?.trim() || undefined,
      location: data.location?.trim() || undefined,
      auctionEndAt: listingMode === 'AUCTION' ? data.auctionEndAt : undefined,
      minimumBid: listingMode === 'AUCTION' ? data.minimumBid : undefined,
      status: 'ATIVA',
      date: todayDateLabel(),
    };

    await setDoc(doc(db, 'salesOffers', newOffer.id), {
      ...newOffer,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newOffer;
  },

  async deleteOffer(offerId: string): Promise<void> {
    await deleteDoc(doc(db, 'salesOffers', offerId));
  },

  async listPdvSales(): Promise<ProducerPdvSale[]> {
    const snapshot = await getDocs(query(producerPdvSalesCollection, orderBy('createdAtTs', 'desc')));
    return snapshot.docs.map((docSnapshot: any) => toPdvSale(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async createPdvSale(payload: CreatePdvSalePayload): Promise<ProducerPdvSale> {
    assertPdvRules(payload);

    const shouldEmitFiscalNow = payload.settlementMode === 'DIRECT_SALE' && !payload.deferFiscalEmission;
    const fiscalStatus: ProducerFiscalStatus =
      payload.settlementMode === 'AUCTION_REMESSA'
        ? 'AGUARDANDO_FINALIZACAO_LEILAO'
        : shouldEmitFiscalNow
          ? 'NF_EMITIDA'
          : 'AGUARDANDO_EMISSAO';

    const newSale: ProducerPdvSale = {
      id: `PDV-${Date.now()}`,
      createdAt: nowLabel(),
      sourceType: payload.sourceType,
      settlementMode: payload.settlementMode,
      fiscalStatus,
      buyer: payload.buyer.trim(),
      description: payload.description.trim(),
      unitPrice: sanitizeNumber(payload.unitPrice),
      totalValue: computeTotalValue(payload),
      actor: payload.actor.trim() || 'Produtor',
      lotId: payload.lotId?.trim() || undefined,
      animalIds: payload.animalIds?.map((item) => item.trim()).filter((item) => item.length > 0),
      headcount: payload.headcount,
      totalWeightKg: payload.totalWeightKg,
      fieldPlot: payload.fieldPlot?.trim() || undefined,
      boxes: payload.boxes,
      assetItemId: payload.assetItemId?.trim() || undefined,
      assetName: payload.assetName?.trim() || undefined,
      saleAuthorizationCode: payload.saleAuthorizationCode?.trim() || undefined,
      vehiclePlate: payload.vehiclePlate?.trim() || undefined,
      scaleQrCode: payload.scaleQrCode?.trim() || undefined,
      deferFiscalEmission: payload.deferFiscalEmission,
      fiscalDocumentNumber: shouldEmitFiscalNow ? generateFiscalDocumentNumber() : undefined,
      fiscalIssuedAt: shouldEmitFiscalNow ? nowLabel() : undefined,
      evidences: (payload.evidences ?? []).map((item) => toSaleEvidence(item)),
    };

    await setDoc(
      doc(db, 'producerPdvSales', newSale.id),
      {
        ...newSale,
        createdAtTs: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const saleRegisteredAudit = await appendAuditEvent({
      actor: newSale.actor,
      action: 'PDV_SALE_REGISTERED',
      details: `${newSale.sourceType} | ${newSale.settlementMode} | comprador=${newSale.buyer} | valor=${newSale.totalValue.toFixed(2)}`,
    });

    let latestAuditHash = saleRegisteredAudit.hash;
    if (shouldEmitFiscalNow) {
      const fiscalAudit = await appendAuditEvent({
        actor: newSale.actor,
        action: 'PDV_NF_ISSUED_AUTO',
        details: `NF ${newSale.fiscalDocumentNumber} emitida automaticamente para venda direta ${newSale.id}.`,
      });
      latestAuditHash = fiscalAudit.hash;
    }

    await updateDoc(doc(db, 'producerPdvSales', newSale.id), {
      auditHash: latestAuditHash,
      updatedAt: serverTimestamp(),
    });

    return {
      ...newSale,
      auditHash: latestAuditHash,
    };
  },

  async attachSaleEvidence(
    saleId: string,
    payload: {
      type: ProducerSaleEvidenceType;
      reference?: string;
      url?: string;
      hash?: string;
      notes?: string;
      actor: string;
    }
  ): Promise<ProducerPdvSale> {
    const saleSnapshot = await getDoc(doc(db, 'producerPdvSales', saleId));
    if (!saleSnapshot.exists()) {
      throw new Error('Venda PDV nao encontrada para anexar evidencia.');
    }

    const sale = toPdvSale(saleSnapshot.id, saleSnapshot.data() as Record<string, unknown>);
    const evidence: ProducerSaleEvidence = {
      id: `EVD-${Date.now()}`,
      type: payload.type,
      createdAt: nowLabel(),
      reference: payload.reference,
      url: payload.url,
      hash: payload.hash,
      notes: payload.notes,
    };

    const nextEvidences = [...sale.evidences, evidence];
    await updateDoc(doc(db, 'producerPdvSales', sale.id), {
      evidences: nextEvidences,
      updatedAt: serverTimestamp(),
    });

    const audit = await appendAuditEvent({
      actor: payload.actor,
      action: 'PDV_EVIDENCE_ATTACHED',
      details: `Evidencia ${payload.type} anexada na venda ${sale.id}.`,
      proofUrl: payload.url,
    });

    await updateDoc(doc(db, 'producerPdvSales', sale.id), {
      auditHash: audit.hash,
      updatedAt: serverTimestamp(),
    });

    return {
      ...sale,
      evidences: nextEvidences,
      auditHash: audit.hash,
    };
  },

  async finalizeAuctionAndIssueInvoice(saleId: string, actor: string): Promise<ProducerPdvSale> {
    const saleSnapshot = await getDoc(doc(db, 'producerPdvSales', saleId));
    if (!saleSnapshot.exists()) {
      throw new Error('Venda PDV nao encontrada para finalizar leilao.');
    }

    const sale = toPdvSale(saleSnapshot.id, saleSnapshot.data() as Record<string, unknown>);
    if (sale.fiscalStatus !== 'AGUARDANDO_FINALIZACAO_LEILAO') {
      throw new Error('Somente remessas em leilao podem ser finalizadas neste fluxo.');
    }

    const fiscalDocumentNumber = generateFiscalDocumentNumber();
    const fiscalIssuedAt = nowLabel();
    await updateDoc(doc(db, 'producerPdvSales', sale.id), {
      fiscalStatus: 'NF_EMITIDA',
      fiscalDocumentNumber,
      fiscalIssuedAt,
      auctionFinishedAt: nowLabel(),
      updatedAt: serverTimestamp(),
    });

    const audit = await appendAuditEvent({
      actor,
      action: 'PDV_AUCTION_FINALIZED_NF_ISSUED',
      details: `Leilao finalizado para ${sale.id} com emissao da NF ${fiscalDocumentNumber}.`,
    });

    await updateDoc(doc(db, 'producerPdvSales', sale.id), {
      auditHash: audit.hash,
      updatedAt: serverTimestamp(),
    });

    return {
      ...sale,
      fiscalStatus: 'NF_EMITIDA',
      fiscalDocumentNumber,
      fiscalIssuedAt,
      auctionFinishedAt: nowLabel(),
      auditHash: audit.hash,
    };
  },

  async issuePendingFiscalDocument(saleId: string, actor: string): Promise<ProducerPdvSale> {
    const saleSnapshot = await getDoc(doc(db, 'producerPdvSales', saleId));
    if (!saleSnapshot.exists()) {
      throw new Error('Venda PDV nao encontrada para emissao pendente.');
    }

    const sale = toPdvSale(saleSnapshot.id, saleSnapshot.data() as Record<string, unknown>);
    if (sale.fiscalStatus !== 'AGUARDANDO_EMISSAO') {
      throw new Error('A operacao informada nao possui emissao fiscal pendente.');
    }

    const fiscalDocumentNumber = generateFiscalDocumentNumber();
    const fiscalIssuedAt = nowLabel();
    await updateDoc(doc(db, 'producerPdvSales', sale.id), {
      fiscalStatus: 'NF_EMITIDA',
      fiscalDocumentNumber,
      fiscalIssuedAt,
      updatedAt: serverTimestamp(),
    });

    const audit = await appendAuditEvent({
      actor,
      action: 'PDV_PENDING_NF_ISSUED',
      details: `NF ${fiscalDocumentNumber} emitida para venda pendente ${sale.id}.`,
    });

    await updateDoc(doc(db, 'producerPdvSales', sale.id), {
      auditHash: audit.hash,
      updatedAt: serverTimestamp(),
    });

    return {
      ...sale,
      fiscalStatus: 'NF_EMITIDA',
      fiscalDocumentNumber,
      fiscalIssuedAt,
      auditHash: audit.hash,
    };
  },
};
