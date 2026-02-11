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

export type AIAnalysisAction = 'TREAT' | 'STUDY';

export interface AIAnalysisResult {
  diagnosis: string;
  confidence: number;
  recommendation: string;
  action: AIAnalysisAction;
  product?: string;
}

export interface AIAnalysisRecord {
  id: string;
  imageName?: string;
  createdAt?: string;
  result: AIAnalysisResult;
}

const analysesCollection = collection(db, 'aiAnalyses');

const seedResults: AIAnalysisResult[] = [
  {
    diagnosis: 'Ferrugem Asiatica (Estagio Inicial)',
    confidence: 94,
    recommendation: 'Aplicacao imediata de fungicida sistemico para controle.',
    action: 'TREAT',
    product: 'Fungicida ABC - 500ml/ha',
  },
  {
    diagnosis: 'Deficiencia Nutricional (Provavel Potassio)',
    confidence: 65,
    recommendation: 'Padrao inconclusivo. Necessaria analise foliar ou visita tecnica para diferenciar de virose.',
    action: 'STUDY',
  },
];

let seeded = false;

const toAnalysisRecord = (id: string, raw: Record<string, unknown>): AIAnalysisRecord => ({
  id,
  imageName: raw.imageName ? String(raw.imageName) : undefined,
  createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  result: {
    diagnosis: String((raw.result as any)?.diagnosis ?? ''),
    confidence: Number((raw.result as any)?.confidence ?? 0),
    recommendation: String((raw.result as any)?.recommendation ?? ''),
    action: ((raw.result as any)?.action as AIAnalysisAction) ?? 'STUDY',
    product: (raw.result as any)?.product ? String((raw.result as any)?.product) : undefined,
  },
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(analysesCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    seedResults.map((result, index) =>
      setDoc(doc(db, 'aiAnalyses', `seed-${index + 1}`), {
        result,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

const generateResult = (): AIAnalysisResult => {
  const selected = seedResults[Math.floor(Math.random() * seedResults.length)];
  return { ...selected };
};

export const aiAnalysisService = {
  async listAnalyses(): Promise<AIAnalysisRecord[]> {
    await ensureSeedData();
    const snapshot = await getDocs(analysesCollection);
    return snapshot.docs.map((docSnapshot) =>
      toAnalysisRecord(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },

  async runAnalysis(imageName?: string): Promise<AIAnalysisResult> {
    await ensureSeedData();
    const result = generateResult();
    await addDoc(analysesCollection, {
      imageName: imageName ?? null,
      result,
      createdAt: serverTimestamp(),
    });
    return result;
  },
};
