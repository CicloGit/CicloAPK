import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { LogisticsEntry } from '../types';

const logisticsCollection = collection(db, 'logisticsEntries');

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

export const logisticsService = {
  async listEntries(): Promise<LogisticsEntry[]> {
    const snapshot = await getDocs(logisticsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toLogisticsEntry(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: LogisticsEntry, b: LogisticsEntry) => a.date.localeCompare(b.date));
  },
};
