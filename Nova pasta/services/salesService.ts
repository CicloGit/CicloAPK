import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockSalesOffers } from '../constants';
import { db } from '../config/firebase';
import { SalesOffer } from '../types';

const salesOfferCollection = collection(db, 'salesOffers');

let seeded = false;

const toSalesOffer = (id: string, raw: Record<string, unknown>): SalesOffer => ({
  id,
  product: String(raw.product ?? ''),
  quantity: String(raw.quantity ?? ''),
  price: Number(raw.price ?? 0),
  status: (raw.status as SalesOffer['status']) ?? 'ATIVA',
  date: String(raw.date ?? new Date().toLocaleDateString('pt-BR')),
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(salesOfferCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockSalesOffers.map((offer) =>
      setDoc(doc(db, 'salesOffers', offer.id), {
        ...offer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const salesService = {
  async listOffers(): Promise<SalesOffer[]> {
    await ensureSeedData();
    const snapshot = await getDocs(salesOfferCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toSalesOffer(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: SalesOffer, b: SalesOffer) => b.date.localeCompare(a.date));
  },

  async createOffer(data: Pick<SalesOffer, 'product' | 'quantity' | 'price'>): Promise<SalesOffer> {
    await ensureSeedData();
    const newOffer: SalesOffer = {
      id: `SO-${Date.now()}`,
      product: data.product,
      quantity: data.quantity,
      price: data.price,
      status: 'ATIVA',
      date: new Date().toLocaleDateString('pt-BR'),
    };

    await setDoc(doc(db, 'salesOffers', newOffer.id), {
      ...newOffer,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newOffer;
  },
};
