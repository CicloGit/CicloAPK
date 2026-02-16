import {
  addDoc,
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
const locksCollection = collection(db, 'futureMarketLocks');

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

export interface FutureLockContract {
  id: string;
  opportunityId: string;
  commodity: string;
  buyer: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  createdAt: string;
}

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

  async createLockContract(opportunity: MarketOpportunity, quantity: number): Promise<FutureLockContract> {
    await ensureSeedData();
    const contract: Omit<FutureLockContract, 'id'> = {
      opportunityId: opportunity.id,
      commodity: opportunity.commodity,
      buyer: opportunity.buyer,
      unit: opportunity.unit,
      quantity,
      unitPrice: opportunity.price,
      totalValue: opportunity.price * quantity,
      createdAt: new Date().toLocaleString('pt-BR'),
    };

    const saved = await addDoc(locksCollection, {
      ...contract,
      createdAtTs: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: saved.id,
      ...contract,
    };
  },
};
