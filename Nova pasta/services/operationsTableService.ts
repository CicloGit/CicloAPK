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

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(operationsCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    operations.map((op, index) =>
      setDoc(doc(db, 'operationsTable', `OP-${index + 1}`), {
        ...op,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

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
    await ensureSeedData();
    const snapshot = await getDocs(operationsCollection);
    return snapshot.docs.map((docSnapshot) =>
      toOperation(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
