import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CorporateCard, ListingCategory, ListingMode, MarketplaceListing, PartnerStore } from '../types';
import { parseDateToTimestamp } from './dateUtils';

const marketplaceCollection = collection(db, 'marketplaceListings');
const corporateCardCollection = collection(db, 'corporateCards');
const partnerStoreCollection = collection(db, 'partnerStores');
const marketplaceOrdersCollection = collection(db, 'marketplaceOrders');

export interface MarketplaceListingsQueryOptions {
  categories?: ListingCategory[];
  requirePublished?: boolean;
  onlyOwnListings?: boolean;
  ownerUserId?: string;
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
    const constraints = buildMarketplaceListingQuery(options);
    const marketplaceQuery = constraints.length > 0 ? query(marketplaceCollection, ...constraints) : marketplaceCollection;
    const snapshot = await getDocs(marketplaceQuery);
    return snapshot.docs
      .map((docSnapshot: any) => toMarketplaceListing(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: MarketplaceListing, b: MarketplaceListing) => a.productName.localeCompare(b.productName));
  },

  async listCorporateCards(): Promise<CorporateCard[]> {
    const snapshot = await getDocs(corporateCardCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toCorporateCard(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: CorporateCard, b: CorporateCard) => a.holderName.localeCompare(b.holderName));
  },

  async listPartnerStores(): Promise<PartnerStore[]> {
    const snapshot = await getDocs(partnerStoreCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toPartnerStore(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: PartnerStore, b: PartnerStore) => a.name.localeCompare(b.name));
  },

  async listMarketplaceOrderHistory(): Promise<MarketplaceOrderHistory[]> {
    const snapshot = await getDocs(query(marketplaceOrdersCollection, orderBy('createdAt', 'desc')));
    const rows: MarketplaceOrderHistory[] = [];

    snapshot.docs.forEach((docSnapshot: any) => {
      const raw = docSnapshot.data() as Record<string, unknown>;
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
};
