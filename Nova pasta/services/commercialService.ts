import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CorporateCard, MarketplaceListing, PartnerStore } from '../types';
import { parseDateToTimestamp } from './dateUtils';

const marketplaceCollection = collection(db, 'marketplaceListings');
const corporateCardCollection = collection(db, 'corporateCards');
const partnerStoreCollection = collection(db, 'partnerStores');
const marketplaceOrdersCollection = collection(db, 'marketplaceOrders');

const toMarketplaceListing = (id: string, raw: Record<string, unknown>): MarketplaceListing => ({
  id,
  productName: String(raw.productName ?? ''),
  b2bSupplier: String(raw.b2bSupplier ?? ''),
  price: Number(raw.price ?? 0),
  unit: String(raw.unit ?? ''),
  rating: Number(raw.rating ?? 0),
  category: String(raw.category ?? ''),
  isPartnerStore: Boolean(raw.isPartnerStore),
  localPartnerStoreId: String(raw.localPartnerStoreId ?? ''),
  localStock: Number(raw.localStock ?? 0),
  b2bStock: Number(raw.b2bStock ?? 0),
  deliveryTimeB2B: String(raw.deliveryTimeB2B ?? ''),
});

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

export const commercialService = {
  async listMarketplaceListings(): Promise<MarketplaceListing[]> {
    const snapshot = await getDocs(marketplaceCollection);
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
