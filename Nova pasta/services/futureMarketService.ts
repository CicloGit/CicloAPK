import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockMarketOpportunities } from '../constants';
import { db } from '../config/firebase';
import { MarketOpportunity } from '../types';

const opportunitiesCollection = collection(db, 'marketOpportunities');

let seeded = false;

const toOpportunity = (id: string, raw: Record<string, unknown>): MarketOpportunity => ({
  id,
  commodity: String(raw.commodity ?? ''),
  buyer: String(raw.buyer ?? ''),
  price: Number(raw.price ?? 0),
  unit: String(raw.unit ?? ''),
  deliveryWindow: String(raw.deliveryWindow ?? ''),
  minQuantity: String(raw.minQuantity ?? ''),
  location: String(raw.location ?? ''),
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(opportunitiesCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockMarketOpportunities.map((item) =>
      setDoc(doc(db, 'marketOpportunities', item.id), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const futureMarketService = {
  async listOpportunities(): Promise<MarketOpportunity[]> {
    await ensureSeedData();
    const snapshot = await getDocs(opportunitiesCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toOpportunity(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: MarketOpportunity, b: MarketOpportunity) => a.commodity.localeCompare(b.commodity));
  },
};
