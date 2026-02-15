import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockProductionProjects } from '../constants';
import { db } from '../config/firebase';
import { ProductionProject } from '../types';

export interface LiveHandlingEntry {
  id: string;
  entityId: string;
  value: string;
  action: string;
  time: string;
}

const historyCollection = collection(db, 'liveHandlingHistory');
const liveContextCollection = collection(db, 'liveHandlingContext');

let seeded = false;

const seedHistory: LiveHandlingEntry[] = [];

const toHistory = (id: string, raw: Record<string, unknown>): LiveHandlingEntry => ({
  id,
  entityId: String(raw.entityId ?? ''),
  value: String(raw.value ?? ''),
  action: String(raw.action ?? ''),
  time: String(raw.time ?? ''),
});

const toProject = (id: string, raw: Record<string, unknown>): ProductionProject => ({
  id,
  name: String(raw.name ?? ''),
  type: (raw.type as ProductionProject['type']) ?? 'Agricultura',
  variety: raw.variety ? String(raw.variety) : undefined,
  status: (raw.status as ProductionProject['status']) ?? 'PLANEJAMENTO',
  volume: String(raw.volume ?? ''),
  prazo: String(raw.prazo ?? ''),
  precoAlvo: String(raw.precoAlvo ?? ''),
  aReceber: Number(raw.aReceber ?? 0),
  aPagar: Number(raw.aPagar ?? 0),
  limiteVigente: Number(raw.limiteVigente ?? 0),
  limiteUtilizado: Number(raw.limiteUtilizado ?? 0),
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(liveContextCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockProductionProjects.map((project) =>
      setDoc(doc(db, 'liveHandlingContext', project.id), {
        ...project,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    seedHistory.map((entry) =>
      setDoc(doc(db, 'liveHandlingHistory', entry.id), {
        ...entry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const liveHandlingService = {
  async listProjects(): Promise<ProductionProject[]> {
    await ensureSeedData();
    const snapshot = await getDocs(liveContextCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listHistory(): Promise<LiveHandlingEntry[]> {
    await ensureSeedData();
    const snapshot = await getDocs(query(historyCollection, orderBy('createdAt', 'desc')));
    return snapshot.docs
      .map((docSnapshot: any) => toHistory(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async createEntry(payload: Omit<LiveHandlingEntry, 'id' | 'time'>): Promise<LiveHandlingEntry> {
    await ensureSeedData();
    const newEntry: LiveHandlingEntry = {
      id: `LIVE-${Date.now()}`,
      entityId: payload.entityId,
      value: payload.value,
      action: payload.action,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    await setDoc(doc(db, 'liveHandlingHistory', newEntry.id), {
      ...newEntry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newEntry;
  },
};
