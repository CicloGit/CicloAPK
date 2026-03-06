import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toEventsMatrixModules } from '../config/operationsCatalog';
import { EventMatrixModule } from '../types';
import { resolveTenantContext } from './tenantContext';

const eventsMatrixCollection = collection(db, 'eventsMatrix');
const toEventModule = (id: string, raw: Record<string, unknown>): EventMatrixModule => ({
  title: String(raw.title ?? id),
  description: raw.description ? String(raw.description) : undefined,
  events: Array.isArray(raw.events)
    ? raw.events.map((event) => ({
        event: String((event as any).event ?? ''),
        module: String((event as any).module ?? ''),
        rules: String((event as any).rules ?? ''),
        locks: String((event as any).locks ?? ''),
        evidence: String((event as any).evidence ?? ''),
        stateMachine: String((event as any).stateMachine ?? ''),
        collections: String((event as any).collections ?? ''),
      }))
    : [],
});

export const eventsMatrixService = {
  async listModules(): Promise<EventMatrixModule[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(eventsMatrixCollection, where('tenantId', '==', context.tenantId)));
    const remoteModules = snapshot.docs.map((docSnapshot: any) =>
      toEventModule(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );

    const catalogModules = toEventsMatrixModules();
    if (remoteModules.length === 0) {
      return catalogModules;
    }

    const merged = new Map<string, EventMatrixModule>();
    [...remoteModules, ...catalogModules].forEach((moduleItem) => {
      merged.set(moduleItem.title, moduleItem);
    });

    return Array.from(merged.values());
  },
};
