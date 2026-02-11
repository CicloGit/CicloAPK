import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { mockSupplierFinancials, mockSupplierOrders } from '../constants';
import { db } from '../config/firebase';
import { SupplierFinancialSummary, SupplierOrder } from '../types';

const supplierOrdersCollection = collection(db, 'supplierOrders');
const supplierFinancialsCollection = collection(db, 'supplierFinancials');

let seeded = false;

const toSupplierOrder = (id: string, raw: Record<string, unknown>): SupplierOrder => ({
  id,
  customer: String(raw.customer ?? ''),
  items: Array.isArray(raw.items) ? (raw.items as SupplierOrder['items']) : [],
  totalValue: Number(raw.totalValue ?? 0),
  date: String(raw.date ?? ''),
  status: (raw.status as SupplierOrder['status']) ?? 'PENDENTE',
});

const toSupplierFinancial = (id: string, raw: Record<string, unknown>): SupplierFinancialSummary => ({
  month: String(raw.month ?? id),
  totalSales: Number(raw.totalSales ?? 0),
  platformFees: Number(raw.platformFees ?? 0),
  netPayout: Number(raw.netPayout ?? 0),
  status: (raw.status as SupplierFinancialSummary['status']) ?? 'A PAGAR',
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(supplierOrdersCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockSupplierOrders.map((order) =>
      setDoc(doc(db, 'supplierOrders', order.id), {
        ...order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockSupplierFinancials.map((entry, index) =>
      setDoc(doc(db, 'supplierFinancials', `FIN-${index + 1}`), {
        ...entry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const supplierService = {
  async listOrders(): Promise<SupplierOrder[]> {
    await ensureSeedData();
    const snapshot = await getDocs(supplierOrdersCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toSupplierOrder(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listFinancialSummaries(): Promise<SupplierFinancialSummary[]> {
    await ensureSeedData();
    const snapshot = await getDocs(supplierFinancialsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toSupplierFinancial(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async markOrderShipped(orderId: string): Promise<void> {
    await ensureSeedData();
    await updateDoc(doc(db, 'supplierOrders', orderId), {
      status: 'ENVIADO',
      updatedAt: serverTimestamp(),
    });
  },
};
