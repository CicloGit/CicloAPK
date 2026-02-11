import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockLogisticsEntries } from '../constants';
import { db } from '../config/firebase';
import { LogisticsEntry } from '../types';

const logisticsCollection = collection(db, 'logisticsEntries');

let seeded = false;

const toLogisticsEntry = (id: string, raw: Record<string, unknown>): LogisticsEntry => ({
  id,
  type: (raw.type as LogisticsEntry['type']) ?? 'Entrega',
  description: String(raw.description ?? ''),
  origin: String(raw.origin ?? ''),
  destination: String(raw.destination ?? ''),
  date: String(raw.date ?? ''),
  status: (raw.status as LogisticsEntry['status']) ?? 'SOLICITADO',
  driver: raw.driver ? String(raw.driver) : undefined,
  plate: raw.plate ? String(raw.plate) : undefined,
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(logisticsCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockLogisticsEntries.map((entry) =>
      setDoc(doc(db, 'logisticsEntries', entry.id), {
        ...entry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const logisticsService = {
  async listEntries(): Promise<LogisticsEntry[]> {
    await ensureSeedData();
    const snapshot = await getDocs(logisticsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toLogisticsEntry(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: LogisticsEntry, b: LogisticsEntry) => a.date.localeCompare(b.date));
  },
};
