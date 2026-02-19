import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toOperationsTableRows } from '../config/operationsCatalog';
import { Operation } from '../types';

const operationsCollection = collection(db, 'operationsTable');
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
    const remoteRows = snapshot.docs.map((docSnapshot: any) =>
      toOperation(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );

    const catalogRows = toOperationsTableRows();
    const merged = new Map<string, Operation>();

    [...remoteRows, ...catalogRows].forEach((row) => {
      merged.set(row.operation, row);
    });

    return Array.from(merged.values());
  },
};

