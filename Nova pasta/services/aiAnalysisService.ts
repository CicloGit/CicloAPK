import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { backendApi } from './backendApi';

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

export const aiAnalysisService = {
  async listAnalyses(): Promise<AIAnalysisRecord[]> {
    await ensureSeedData();
    const snapshot = await getDocs(analysesCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toAnalysisRecord(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },

  async runAnalysis(imageName?: string): Promise<AIAnalysisResult> {
    const result = await backendApi.analyzeImage(imageName ?? 'imagem-sem-nome');
    return {
      diagnosis: result.diagnosis,
      confidence: result.confidence,
      recommendation: result.recommendation,
      action: result.action,
      product: result.product,
    };
  },
};
