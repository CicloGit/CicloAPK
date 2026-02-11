import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockCorporateCards, mockMarketplaceListings, mockPartnerStores } from '../constants';
import { db } from '../config/firebase';
import { CorporateCard, MarketplaceListing, PartnerStore } from '../types';

const marketplaceCollection = collection(db, 'marketplaceListings');
const corporateCardCollection = collection(db, 'corporateCards');
const partnerStoreCollection = collection(db, 'partnerStores');

let seeded = false;

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

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(marketplaceCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockMarketplaceListings.map((item) =>
      setDoc(doc(db, 'marketplaceListings', item.id), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockCorporateCards.map((item) =>
      setDoc(doc(db, 'corporateCards', item.id), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockPartnerStores.map((item) =>
      setDoc(doc(db, 'partnerStores', item.id), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const commercialService = {
  async listMarketplaceListings(): Promise<MarketplaceListing[]> {
    await ensureSeedData();
    const snapshot = await getDocs(marketplaceCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toMarketplaceListing(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: MarketplaceListing, b: MarketplaceListing) => a.productName.localeCompare(b.productName));
  },

  async listCorporateCards(): Promise<CorporateCard[]> {
    await ensureSeedData();
    const snapshot = await getDocs(corporateCardCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toCorporateCard(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: CorporateCard, b: CorporateCard) => a.holderName.localeCompare(b.holderName));
  },

  async listPartnerStores(): Promise<PartnerStore[]> {
    await ensureSeedData();
    const snapshot = await getDocs(partnerStoreCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toPartnerStore(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: PartnerStore, b: PartnerStore) => a.name.localeCompare(b.name));
  },
};
