import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LiquidationFlow } from '../types';
import { resolveTenantContext } from './tenantContext';

const liquidationFlowsCollection = collection(db, 'liquidationFlows');
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
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(liquidationFlowsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs.map((docSnapshot: any) =>
      toLiquidationFlow(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
