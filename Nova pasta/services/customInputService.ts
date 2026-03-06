import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { resolveTenantContext, withTenantFields } from './tenantContext';

export interface CustomInputPasture {
  id: string;
  name: string;
}

export interface CustomInputAnimalContext {
  projectId: string;
  pastures: CustomInputPasture[];
}

export interface CustomInputFormulaItem {
  component: string;
  amount: string;
  reason: string;
}

export interface CustomInputRequest {
  id: string;
  pastureId: string;
  herdType: 'Cria' | 'Recria' | 'Engorda';
  soilFileName: string;
  createdAt?: string;
  status?: 'REQUESTED' | 'APPROVED' | 'REJECTED';
}

export interface CustomInputFormula {
  summary: string;
  composition: CustomInputFormulaItem[];
  regulatoryNote: string;
}

const requestsCollection = collection(db, 'customInputRequests');
const formulasCollection = collection(db, 'customInputFormulas');
const pastureCollection = collection(db, 'customInputPastures');

const EMPTY_FORMULA: CustomInputFormula = {
  summary: '',
  composition: [],
  regulatoryNote: '',
};
export const customInputService = {
  async listPastures(): Promise<CustomInputPasture[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(pastureCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs.map((docSnapshot: any) => ({
      id: docSnapshot.id,
      name: String((docSnapshot.data() as Record<string, unknown>).name ?? ''),
    }));
  },

  async getFormula(): Promise<CustomInputFormula> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(formulasCollection, where('tenantId', '==', context.tenantId), limit(1)));
    if (snapshot.empty) {
      return EMPTY_FORMULA;
    }
    const docData = snapshot.docs[0].data() as Record<string, unknown>;
    return {
      summary: String(docData.summary ?? EMPTY_FORMULA.summary),
      composition: Array.isArray(docData.composition)
        ? docData.composition.map((item) => ({
            component: String((item as any).component ?? ''),
            amount: String((item as any).amount ?? ''),
            reason: String((item as any).reason ?? ''),
          }))
        : EMPTY_FORMULA.composition,
      regulatoryNote: String(docData.regulatoryNote ?? EMPTY_FORMULA.regulatoryNote),
    };
  },

  async submitRequest(payload: Omit<CustomInputRequest, 'id'>): Promise<void> {
    const context = await resolveTenantContext();
    await addDoc(
      requestsCollection,
      withTenantFields(
        {
          ...payload,
          status: payload.status ?? 'REQUESTED',
          createdAt: serverTimestamp(),
        },
        context
      )
    );
  },
};
