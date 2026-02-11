import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockManagementAlerts, mockManagementHistory } from '../constants';
import { db } from '../config/firebase';
import { ManagementAlert, ManagementRecord } from '../types';

const alertsCollection = collection(db, 'managementAlerts');
const historyCollection = collection(db, 'managementHistory');

let seeded = false;

const toAlert = (id: string, raw: Record<string, unknown>): ManagementAlert => ({
  id,
  target: String(raw.target ?? ''),
  type: (raw.type as ManagementAlert['type']) ?? 'Nutrition',
  message: String(raw.message ?? ''),
  reason: String(raw.reason ?? ''),
  severity: (raw.severity as ManagementAlert['severity']) ?? 'INFO',
  dueDate: String(raw.dueDate ?? ''),
});

const toHistory = (id: string, raw: Record<string, unknown>): ManagementRecord => ({
  id,
  date: String(raw.date ?? ''),
  target: String(raw.target ?? ''),
  actionType: String(raw.actionType ?? ''),
  product: String(raw.product ?? ''),
  quantity: String(raw.quantity ?? ''),
  executor: String(raw.executor ?? ''),
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(alertsCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockManagementAlerts.map((alert) =>
      setDoc(doc(db, 'managementAlerts', alert.id), {
        ...alert,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockManagementHistory.map((record) =>
      setDoc(doc(db, 'managementHistory', record.id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const managementService = {
  async listAlerts(): Promise<ManagementAlert[]> {
    await ensureSeedData();
    const snapshot = await getDocs(alertsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toAlert(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listHistory(): Promise<ManagementRecord[]> {
    await ensureSeedData();
    const snapshot = await getDocs(historyCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toHistory(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};
