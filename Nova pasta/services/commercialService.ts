import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  CorporateCard,
  ListingCategory,
  ListingMode,
  MarketplaceListing,
  PartnerStore,
  ProducerMarketplaceProfile,
  ProducerPurchaseNeed,
  User,
} from '../types';
import { parseDateToTimestamp } from './dateUtils';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';
import { networkNeedsService } from './networkNeedsService';

const marketplaceCollection = collection(db, 'marketplaceListings');
const corporateCardCollection = collection(db, 'corporateCards');
const partnerStoreCollection = collection(db, 'partnerStores');
const marketplaceOrdersCollection = collection(db, 'marketplaceOrders');
const integratedProducersCollection = collection(db, 'integratedProducers');
const producerPurchaseNeedsCollection = collection(db, 'producerPurchaseNeeds');

export interface MarketplaceListingsQueryOptions {
  categories?: ListingCategory[];
  requirePublished?: boolean;
  onlyOwnListings?: boolean;
  ownerUserId?: string;
}

export interface ProducerDirectoryQueryOptions {
  productionTerm?: string;
}

const normalizeListingCategory = (raw: Record<string, unknown>): ListingCategory => {
  const source = String(raw.listingCategory ?? raw.category ?? '').trim().toUpperCase();
  if (source === 'INPUTS_INDUSTRY') {
    return 'INPUTS_INDUSTRY';
  }
  if (source === 'AUCTION_P2P') {
    return 'AUCTION_P2P';
  }
  return 'OUTPUTS_PRODUCER';
};

const normalizeListingMode = (raw: Record<string, unknown>, category: ListingCategory): ListingMode => {
  if (category === 'AUCTION_P2P') {
    return 'AUCTION';
  }
  return String(raw.listingMode ?? '').trim().toUpperCase() === 'AUCTION' ? 'AUCTION' : 'FIXED_PRICE';
};

const toMarketplaceListing = (id: string, raw: Record<string, unknown>): MarketplaceListing => {
  const listingCategory = normalizeListingCategory(raw);
  return {
    id,
    tenantId: String(raw.tenantId ?? ''),
    createdByUserId: String(raw.createdByUserId ?? raw.createdBy ?? ''),
    listingCategory,
    listingMode: normalizeListingMode(raw, listingCategory),
    productName: String(raw.productName ?? ''),
    productType: String(raw.productType ?? raw.category ?? ''),
    sector: String(raw.sector ?? ''),
    productionSector: String(raw.productionSector ?? ''),
    b2bSupplier: String(raw.b2bSupplier ?? raw.supplierName ?? ''),
    price: Number(raw.price ?? 0),
    priceModel:
      String(raw.priceModel ?? '').trim().toUpperCase() === 'TIERED'
        ? 'TIERED'
        : String(raw.priceModel ?? '').trim().toUpperCase() === 'QUOTE_REQUIRED'
          ? 'QUOTE_REQUIRED'
          : String(raw.priceModel ?? '').trim().toUpperCase() === 'AUCTION'
            ? 'AUCTION'
            : 'FIXED',
    unit: String(raw.unit ?? ''),
    quantityAvailable: Number(raw.quantityAvailable ?? raw.b2bStock ?? 0),
    region: String(raw.region ?? ''),
    status: String(raw.status ?? 'DRAFT') as MarketplaceListing['status'],
    createdAt: String(raw.createdAtIso ?? ''),
    updatedAt: String(raw.updatedAtIso ?? ''),
    rating: Number(raw.rating ?? 0),
    category: String(raw.category ?? ''),
    isPartnerStore: Boolean(raw.isPartnerStore),

    // Dual-stock compatibility
    localPartnerStoreId: String(raw.localPartnerStoreId ?? ''),
    localStock: Number(raw.localStock ?? 0),
    b2bStock: Number(raw.b2bStock ?? raw.quantityAvailable ?? 0),
    deliveryTimeB2B: String(raw.deliveryTimeB2B ?? ''),
  };
};

const toCorporateCard = (id: string, raw: Record<string, unknown>): CorporateCard => ({
  id,
  holderName: String(raw.holderName ?? ''),
  linkedAccount: String(raw.linkedAccount ?? ''),
  last4Digits: String(raw.last4Digits ?? ''),
  balance: Number(raw.balance ?? 0),
  network: String(raw.network ?? ''),
});

const toPartnerStore = (id: string, raw: Record<string, unknown>): PartnerStore => ({
  id,
  name: String(raw.name ?? ''),
  location: String(raw.location ?? ''),
});

const normalizeIsoDate = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  const asTimestamp = value as { toDate?: () => Date } | undefined;
  if (asTimestamp && typeof asTimestamp.toDate === 'function') {
    return asTimestamp.toDate().toISOString();
  }
  return new Date().toISOString();
};

const toProducerPurchaseNeed = (id: string, raw: Record<string, unknown>): ProducerPurchaseNeed => ({
  id,
  requesterUserId: raw.requesterUserId ? String(raw.requesterUserId) : undefined,
  requesterName: String(raw.requesterName ?? ''),
  targetProducerId: String(raw.targetProducerId ?? ''),
  targetProducerName: String(raw.targetProducerName ?? ''),
  product: String(raw.product ?? ''),
  quantity: String(raw.quantity ?? ''),
  notes: raw.notes ? String(raw.notes) : undefined,
  status: (() => {
    const status = String(raw.status ?? '').toUpperCase();
    if (status === 'EM_NEGOCIACAO' || status === 'ENCERRADA' || status === 'CANCELADA') {
      return status as ProducerPurchaseNeed['status'];
    }
    return 'ABERTA';
  })(),
  createdAt: normalizeIsoDate(raw.createdAt),
});

export interface MarketplaceOrderHistory {
  id: string;
  product: string;
  supplier: string;
  value: number;
  status: string;
  date: string;
}

const buildMarketplaceListingQuery = (options: MarketplaceListingsQueryOptions): Array<ReturnType<typeof where>> => {
  const constraints: Array<ReturnType<typeof where>> = [];

  if (options.requirePublished !== false) {
    constraints.push(where('status', '==', 'PUBLISHED'));
  }

  if (Array.isArray(options.categories) && options.categories.length === 1) {
    constraints.push(where('listingCategory', '==', options.categories[0]));
  } else if (Array.isArray(options.categories) && options.categories.length > 1) {
    constraints.push(where('listingCategory', 'in', options.categories.slice(0, 10)));
  }

  if (options.onlyOwnListings && options.ownerUserId) {
    constraints.push(where('createdByUserId', '==', options.ownerUserId));
  }

  return constraints;
};

export const commercialService = {
  async listMarketplaceListings(options: MarketplaceListingsQueryOptions = {}): Promise<MarketplaceListing[]> {
    const context = await resolveTenantContext();
    const constraints = buildMarketplaceListingQuery(options);
    const marketplaceQuery = constraints.length > 0 ? query(marketplaceCollection, ...constraints) : marketplaceCollection;
    const snapshot = await getDocs(marketplaceQuery);
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        const listing = toMarketplaceListing(docSnapshot.id, raw);
        const normalizedVisibility = String(raw.visibility ?? '').trim().toUpperCase();
        const isPublicMarket =
          normalizedVisibility === 'PUBLIC' || normalizedVisibility === 'OPEN_MARKET' || listing.status === 'PUBLISHED';
        return { raw, listing, isPublicMarket };
      })
      .filter((row: { raw: Record<string, unknown>; isPublicMarket: boolean }) =>
        hasTenantAccess(row.raw, context) || row.isPublicMarket
      )
      .map((row: { listing: MarketplaceListing }) => row.listing)
      .sort((a: MarketplaceListing, b: MarketplaceListing) => a.productName.localeCompare(b.productName));
  },

  async listCorporateCards(): Promise<CorporateCard[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(corporateCardCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, card: toCorporateCard(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { card: CorporateCard }) => row.card)
      .sort((a: CorporateCard, b: CorporateCard) => a.holderName.localeCompare(b.holderName));
  },

  async listPartnerStores(): Promise<PartnerStore[]> {
    const context = await resolveTenantContext();
    const [tenantSnapshot, publicSnapshot] = await Promise.all([
      getDocs(query(partnerStoreCollection, where('tenantId', '==', context.tenantId))),
      getDocs(query(partnerStoreCollection, where('visibility', 'in', ['PUBLIC', 'OPEN_MARKET']))),
    ]);
    const mergedDocs = [...tenantSnapshot.docs, ...publicSnapshot.docs];
    const deduped = new Map<string, any>();
    mergedDocs.forEach((docSnapshot: any) => {
      deduped.set(docSnapshot.id, docSnapshot);
    });

    return Array.from(deduped.values())
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        const normalizedVisibility = String(raw.visibility ?? '').trim().toUpperCase();
        const isPublicMarket = normalizedVisibility === 'PUBLIC' || normalizedVisibility === 'OPEN_MARKET';
        return { raw, store: toPartnerStore(docSnapshot.id, raw), isPublicMarket };
      })
      .filter((row: { raw: Record<string, unknown>; isPublicMarket: boolean }) =>
        hasTenantAccess(row.raw, context) || row.isPublicMarket
      )
      .map((row: { store: PartnerStore }) => row.store)
      .sort((a: PartnerStore, b: PartnerStore) => a.name.localeCompare(b.name));
  },

  async listMarketplaceOrderHistory(): Promise<MarketplaceOrderHistory[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(marketplaceOrdersCollection, where('tenantId', '==', context.tenantId)));
    const rows: MarketplaceOrderHistory[] = [];

    snapshot.docs.forEach((docSnapshot: any) => {
      const raw = docSnapshot.data() as Record<string, unknown>;
      if (!hasTenantAccess(raw, context)) {
        return;
      }
      const items = Array.isArray(raw.items) ? (raw.items as Array<Record<string, unknown>>) : [];
      const status = String(raw.status ?? 'PAID_ESCROW');
      const labelDate = String(raw.createdAtLabel ?? '');
      const createdAtSeconds =
        typeof (raw.createdAt as { seconds?: number } | undefined)?.seconds === 'number'
          ? (raw.createdAt as { seconds: number }).seconds * 1000
          : 0;
      const fallbackDate = createdAtSeconds > 0 ? new Date(createdAtSeconds).toLocaleDateString('pt-BR') : labelDate;

      items.forEach((item, index) => {
        rows.push({
          id: `${docSnapshot.id}-${index}`,
          product: String(item.productName ?? 'Produto'),
          supplier: String(item.supplier ?? 'Fornecedor'),
          value: Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0),
          status: status === 'PAID_ESCROW' ? 'Aguardando Envio' : status,
          date: fallbackDate,
        });
      });
    });

    return rows.sort((a, b) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async listProducerProfiles(options: ProducerDirectoryQueryOptions = {}): Promise<ProducerMarketplaceProfile[]> {
    const normalizedProductionTerm = String(options.productionTerm ?? '').trim().toLowerCase();
    const [producerSnapshot, listingSnapshot] = await Promise.all([
      getDocs(integratedProducersCollection),
      getDocs(marketplaceCollection),
    ]);

    const publishedProducerListings = listingSnapshot.docs
      .map((docSnapshot: any) => toMarketplaceListing(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .filter((listing: MarketplaceListing) => listing.listingCategory === 'OUTPUTS_PRODUCER' && listing.status === 'PUBLISHED');

    const normalizeKey = (value: string): string => value.trim().toUpperCase();

    const profiles = producerSnapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        const producerName = String(raw.maskedName ?? raw.producerName ?? raw.name ?? 'Produtor');
        const producerUserId = String(raw.userId ?? raw.producerId ?? raw.createdByUserId ?? '').trim();
        const primaryProduction = String(raw.productionType ?? raw.activity ?? '').trim();
        const additionalTags = Array.isArray(raw.productionTags) ? raw.productionTags.map((item) => String(item).trim()) : [];
        const productionTags = [primaryProduction, ...additionalTags].filter((item) => item.length > 0);

        const hasActiveOffer = publishedProducerListings.some(
          (listing: MarketplaceListing) =>
            (producerUserId.length > 0 && listing.createdByUserId === producerUserId) ||
            normalizeKey(listing.b2bSupplier) === normalizeKey(producerName)
        );

        const creditScore = Math.max(0, Math.min(100, Number(raw.creditScore ?? raw.auditScore ?? 70)));
        const contractGoalRate = Math.max(0, Math.min(100, Number(raw.contractGoalRate ?? raw.auditScore ?? 65)));
        const marketplaceScore = Math.round(creditScore * 0.6 + contractGoalRate * 0.4);

        const profile: ProducerMarketplaceProfile = {
          id: docSnapshot.id,
          producerName,
          productionTags,
          region: String(raw.region ?? 'Regiao nao informada'),
          hasActiveOffer,
          creditScore,
          contractGoalRate,
          marketplaceScore,
        };
        return profile;
      })
      .filter((profile: ProducerMarketplaceProfile) => {
        if (!normalizedProductionTerm) {
          return true;
        }
        const searchable = `${profile.producerName} ${profile.productionTags.join(' ')} ${profile.region}`.toLowerCase();
        return searchable.includes(normalizedProductionTerm);
      })
      .sort((a: ProducerMarketplaceProfile, b: ProducerMarketplaceProfile) => b.marketplaceScore - a.marketplaceScore);

    return profiles;
  },

  async createProducerPurchaseNeed(payload: {
    targetProducerId: string;
    targetProducerName: string;
    requesterName: string;
    requesterRole?: User['role'];
    product: string;
    quantity: string;
    notes?: string;
  }): Promise<ProducerPurchaseNeed> {
    const context = await resolveTenantContext();
    if (!payload.targetProducerId.trim() || !payload.targetProducerName.trim()) {
      throw new Error('Selecione um produtor para direcionar a necessidade.');
    }
    if (!payload.product.trim() || !payload.quantity.trim()) {
      throw new Error('Informe produto e quantidade da necessidade de compra.');
    }

    const nowIso = new Date().toISOString();
    const record = {
      requesterUserId: context.userId,
      requesterName: payload.requesterName.trim() || 'Comprador',
      targetProducerId: payload.targetProducerId.trim(),
      targetProducerName: payload.targetProducerName.trim(),
      product: payload.product.trim(),
      quantity: payload.quantity.trim(),
      notes: payload.notes?.trim() || null,
      status: 'ABERTA' as ProducerPurchaseNeed['status'],
      createdAt: nowIso,
    };

    const createdRef = await addDoc(
      producerPurchaseNeedsCollection,
      withTenantFields(
        {
          ...record,
          createdAtServer: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      )
    );

    await networkNeedsService.upsertSourceNeed({
      sourcePortal: 'PRODUCER',
      sourceRecordId: createdRef.id,
      title: `Necessidade de compra: ${record.product}`,
      description: record.notes
        ? `${record.requesterName} solicitou ${record.quantity} de ${record.product}. Detalhes: ${record.notes}`
        : `${record.requesterName} solicitou ${record.quantity} de ${record.product}.`,
      requesterName: record.requesterName,
      requesterRole: payload.requesterRole ?? 'Produtor',
      product: record.product,
      quantity: record.quantity,
      targetProducerId: record.targetProducerId,
      targetProducerName: record.targetProducerName,
      visibility: 'NETWORK',
      visibleToRoles: ['Produtor', 'Integradora', 'Fornecedor'],
      status: 'ABERTA',
    });

    return {
      id: createdRef.id,
      requesterUserId: record.requesterUserId,
      requesterName: record.requesterName,
      targetProducerId: record.targetProducerId,
      targetProducerName: record.targetProducerName,
      product: record.product,
      quantity: record.quantity,
      notes: record.notes ?? undefined,
      status: record.status,
      createdAt: record.createdAt,
    };
  },

  async listProducerPurchaseNeeds(): Promise<ProducerPurchaseNeed[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(producerPurchaseNeedsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, need: toProducerPurchaseNeed(docSnapshot.id, raw) };
      })
      .filter(
        (row: { raw: Record<string, unknown>; need: ProducerPurchaseNeed }) =>
          hasTenantAccess(row.raw, context) || row.need.requesterUserId === context.userId
      )
      .map((row: { need: ProducerPurchaseNeed }) => row.need)
      .sort((a: ProducerPurchaseNeed, b: ProducerPurchaseNeed) => b.createdAt.localeCompare(a.createdAt));
  },
};
