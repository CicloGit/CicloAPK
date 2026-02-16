import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { operations } from '../constants';
import { db } from '../config/firebase';
import { Operation } from '../types';

const operationsCollection = collection(db, 'operationsTable');

let seeded = false;


const toOperation = (id: string, raw: Record<string, unknown>): Operation => ({
  operation: String(raw.operation ?? ''),
  profile: String(raw.profile ?? ''),
  entity: String(raw.entity ?? ''),
  rule: String(raw.rule ?? ''),
  evidence: String(raw.evidence ?? ''),
  effect: String(raw.effect ?? ''),
});

export const operationsTableService = {
  async listOperations(): Promise<Operation[]> {
    const snapshot = await getDocs(operationsCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toOperation(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
