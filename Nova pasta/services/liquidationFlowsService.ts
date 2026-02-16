import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LiquidationFlow } from '../types';

const liquidationFlowsCollection = collection(db, 'liquidationFlows');

let seeded = false;

async function ensureSeedData() {
  if (seeded) {
    return;
  }

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
    return snapshot.docs.map((docSnapshot: any) =>
      toLiquidationFlow(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
