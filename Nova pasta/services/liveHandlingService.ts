import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ProductionProject } from '../types';
import { resolveTenantContext, withTenantFields } from './tenantContext';

export interface LiveHandlingEntry {
  id: string;
  projectId: string;
  entityId: string;
  value: string;
  action: string;
  time: string;
}

const historyCollection = collection(db, 'liveHandlingHistory');
const liveContextCollection = collection(db, 'liveHandlingContext');
const toHistory = (id: string, raw: Record<string, unknown>): LiveHandlingEntry => ({
  id,
  projectId: String(raw.projectId ?? ''),
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

export const liveHandlingService = {
  async listProjects(): Promise<ProductionProject[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(liveContextCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listHistory(): Promise<LiveHandlingEntry[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(historyCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => toHistory(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: LiveHandlingEntry, b: LiveHandlingEntry) => b.time.localeCompare(a.time));
  },

  async createEntry(payload: Omit<LiveHandlingEntry, 'id' | 'time'>): Promise<LiveHandlingEntry> {
    const context = await resolveTenantContext();
    const newEntry: LiveHandlingEntry = {
      id: `LIVE-${Date.now()}`,
      projectId: payload.projectId,
      entityId: payload.entityId,
      value: payload.value,
      action: payload.action,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    await setDoc(
      doc(db, 'liveHandlingHistory', newEntry.id),
      withTenantFields(
        {
          ...newEntry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return newEntry;
  },
};
