import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
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

const seedPastures: CustomInputPasture[] = [
  { id: 'P-001', name: 'Pasto Palmeiras' },
  { id: 'P-002', name: 'Pasto Santa Fe' },
  { id: 'P-003', name: 'Pasto Horizonte' },
];

const seedFormula: CustomInputFormula = {
  summary: 'Detectamos deficiencia de Fosforo (P) e Cobre (Cu), limitando o ganho de peso do rebanho.',
  composition: [
    { component: 'Fosfato Bicalcico', amount: '35%', reason: 'Corrigir deficiencia de Fosforo (P).' },
    { component: 'Cloreto de Sodio', amount: '52%', reason: 'Fonte de Sodio e Cloro.' },
    { component: 'Sulfato de Cobre', amount: '2%', reason: 'Suplementar Cobre (Cu).' },
    { component: 'Oxido de Zinco', amount: '4%', reason: 'Fonte de Zinco.' },
    { component: 'Enxofre Ventilado', amount: '7%', reason: 'Fonte de Enxofre.' },
  ],
  regulatoryNote: 'Formula isenta de registro, conforme IN 65 do MAPA, para consumo exclusivo na propriedade.',
};

let seeded = false;

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(pastureCollection, limit(1)));
  if (snapshot.empty) {
    await Promise.all(
      seedPastures.map((pasture) =>
        setDoc(doc(db, 'customInputPastures', pasture.id), {
          ...pasture,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    );
  }

  const formulaSnapshot = await getDocs(query(formulasCollection, limit(1)));
  if (formulaSnapshot.empty) {
    await setDoc(doc(db, 'customInputFormulas', 'default'), {
      ...seedFormula,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  seeded = true;
}

export const customInputService = {
  async listPastures(): Promise<CustomInputPasture[]> {
    await ensureSeedData();
    const snapshot = await getDocs(pastureCollection);
    return snapshot.docs.map((docSnapshot: any) => ({
      id: docSnapshot.id,
      name: String((docSnapshot.data() as Record<string, unknown>).name ?? ''),
    }));
  },

  async getFormula(): Promise<CustomInputFormula> {
    await ensureSeedData();
    const snapshot = await getDocs(query(formulasCollection, limit(1)));
    if (snapshot.empty) {
      return seedFormula;
    }
    const docData = snapshot.docs[0].data() as Record<string, unknown>;
    return {
      summary: String(docData.summary ?? seedFormula.summary),
      composition: Array.isArray(docData.composition)
        ? docData.composition.map((item) => ({
            component: String((item as any).component ?? ''),
            amount: String((item as any).amount ?? ''),
            reason: String((item as any).reason ?? ''),
          }))
        : seedFormula.composition,
      regulatoryNote: String(docData.regulatoryNote ?? seedFormula.regulatoryNote),
    };
  },

  async submitRequest(payload: Omit<CustomInputRequest, 'id'>): Promise<void> {
    await ensureSeedData();
    await addDoc(requestsCollection, {
      ...payload,
      status: payload.status ?? 'REQUESTED',
      createdAt: serverTimestamp(),
    });
  },
};
