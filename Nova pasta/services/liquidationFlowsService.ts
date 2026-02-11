import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { liquidationFlows } from '../constants';
import { db } from '../config/firebase';
import { LiquidationFlow } from '../types';

const liquidationFlowsCollection = collection(db, 'liquidationFlows');

let seeded = false;

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(liquidationFlowsCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    liquidationFlows.map((flow, index) =>
      setDoc(doc(db, 'liquidationFlows', `FLOW-${index + 1}`), {
        ...flow,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

const toLiquidationFlow = (id: string, raw: Record<string, unknown>): LiquidationFlow => ({
  title: String(raw.title ?? id),
  description: String(raw.description ?? ''),
  steps: Array.isArray(raw.steps)
    ? raw.steps.map((step) => ({
        name: String((step as any).name ?? ''),
        completed: Boolean((step as any).completed ?? false),
      }))
    : [],
});

export const liquidationFlowsService = {
  async listFlows(): Promise<LiquidationFlow[]> {
    await ensureSeedData();
    const snapshot = await getDocs(liquidationFlowsCollection);
    return snapshot.docs.map((docSnapshot) =>
      toLiquidationFlow(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
