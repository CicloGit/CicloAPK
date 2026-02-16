import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
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
      .filter((docSnapshot: any) => !(docSnapshot.data() as Record<string, unknown>).resolved)
      .map((docSnapshot: any) => toAlert(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listHistory(): Promise<ManagementRecord[]> {
    await ensureSeedData();
    const snapshot = await getDocs(query(historyCollection, orderBy('createdAt', 'desc')));
    return snapshot.docs
      .map((docSnapshot: any) => toHistory(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async createHistoryRecord(data: Omit<ManagementRecord, 'id' | 'date'>): Promise<ManagementRecord> {
    await ensureSeedData();
    const newRecord: ManagementRecord = {
      id: `HIST-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
      target: data.target,
      actionType: data.actionType,
      product: data.product,
      quantity: data.quantity,
      executor: data.executor,
    };

    await setDoc(doc(db, 'managementHistory', newRecord.id), {
      ...newRecord,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newRecord;
  },

  async resolveAlert(alertId: string): Promise<void> {
    await ensureSeedData();
    await updateDoc(doc(db, 'managementAlerts', alertId), {
      resolved: true,
      updatedAt: serverTimestamp(),
    });
  },
};
