import {
  addDoc,
  collection,
  getDocs,
  limit,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

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


export const customInputService = {
  async listPastures(): Promise<CustomInputPasture[]> {
    const snapshot = await getDocs(pastureCollection);
    return snapshot.docs.map((docSnapshot: any) => ({
      id: docSnapshot.id,
      name: String((docSnapshot.data() as Record<string, unknown>).name ?? ''),
    }));
  },

  async getFormula(): Promise<CustomInputFormula> {
    const snapshot = await getDocs(query(formulasCollection, limit(1)));
    if (snapshot.empty) {
      return {
        summary: '',
        composition: [],
        regulatoryNote: '',
      };
    }
    const docData = snapshot.docs[0].data() as Record<string, unknown>;
    return {
      summary: String(docData.summary ?? ''),
      composition: Array.isArray(docData.composition)
        ? docData.composition.map((item) => ({
            component: String((item as any).component ?? ''),
            amount: String((item as any).amount ?? ''),
            reason: String((item as any).reason ?? ''),
          }))
        : [],
      regulatoryNote: String(docData.regulatoryNote ?? ''),
    };
  },

  async submitRequest(payload: Omit<CustomInputRequest, 'id'>): Promise<void> {
    await addDoc(requestsCollection, {
      ...payload,
      status: payload.status ?? 'REQUESTED',
      createdAt: serverTimestamp(),
    });
  },
};
