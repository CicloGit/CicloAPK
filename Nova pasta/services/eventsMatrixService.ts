import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { eventsMatrixData } from '../constants';
import { db } from '../config/firebase';
import { EventMatrixModule } from '../types';

const eventsMatrixCollection = collection(db, 'eventsMatrix');

let seeded = false;


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
    const snapshot = await getDocs(eventsMatrixCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toEventModule(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
