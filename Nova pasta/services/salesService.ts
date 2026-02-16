import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { parseDateToTimestamp } from './dateUtils';
import { SalesOffer } from '../types';

const salesOfferCollection = collection(db, 'salesOffers');

const toSalesOffer = (id: string, raw: Record<string, unknown>): SalesOffer => ({
  id,
  product: String(raw.product ?? ''),
  quantity: String(raw.quantity ?? ''),
  price: Number(raw.price ?? 0),
  status: (raw.status as SalesOffer['status']) ?? 'ATIVA',
  date: String(raw.date ?? new Date().toLocaleDateString('pt-BR')),
});

export const salesService = {
  async listOffers(): Promise<SalesOffer[]> {
    const snapshot = await getDocs(salesOfferCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toSalesOffer(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: SalesOffer, b: SalesOffer) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async createOffer(data: Pick<SalesOffer, 'product' | 'quantity' | 'price'>): Promise<SalesOffer> {
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
