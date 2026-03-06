import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { backendApi } from './backendApi';
import { CropSeason, ProducerCultureStage, ProducerPlantCondition, ProducerSoilType, PublicClimateRegion } from '../types';
import { resolveTenantContext } from './tenantContext';

export type AIAnalysisAction = 'TREAT' | 'STUDY';

export interface AIImageSignals {
  greenRatio?: number;
  yellowRatio?: number;
  brownRatio?: number;
  brightness?: number;
}

export interface AIAnalysisContext {
  cultureName?: string;
  soilType?: ProducerSoilType;
  region?: PublicClimateRegion;
  season?: CropSeason;
  rainfallMm?: number;
  fertilizationKgHa?: number;
  animalHandlingDays?: number;
  daysFromPlanting?: number;
  imageSignals?: AIImageSignals;
}

export interface AIAnalysisResult {
  diagnosis: string;
  confidence: number;
  recommendation: string;
  action: AIAnalysisAction;
  product?: string;
  stage?: ProducerCultureStage;
  condition?: ProducerPlantCondition;
  nutrientN?: number;
  nutrientP?: number;
  nutrientK?: number;
  nutrientIndex?: number;
  estimatedProductivityKgHa?: number;
  recommendedNpk?: string;
  season?: CropSeason;
  rainfallMm?: number;
  region?: PublicClimateRegion;
}

export interface AIAnalysisRecord {
  id: string;
  imageName?: string;
  createdAt?: string;
  context?: AIAnalysisContext;
  result: AIAnalysisResult;
}

const analysesCollection = collection(db, 'aiAnalyses');

const toAnalysisRecord = (id: string, raw: Record<string, unknown>): AIAnalysisRecord => ({
  id,
  imageName: raw.imageName ? String(raw.imageName) : undefined,
  createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  context: raw.context && typeof raw.context === 'object' ? (raw.context as AIAnalysisContext) : undefined,
  result: {
    diagnosis: String((raw.result as any)?.diagnosis ?? ''),
    confidence: Number((raw.result as any)?.confidence ?? 0),
    recommendation: String((raw.result as any)?.recommendation ?? ''),
    action: ((raw.result as any)?.action as AIAnalysisAction) ?? 'STUDY',
    product: (raw.result as any)?.product ? String((raw.result as any)?.product) : undefined,
    stage: (raw.result as any)?.stage ? ((raw.result as any).stage as ProducerCultureStage) : undefined,
    condition: (raw.result as any)?.condition ? ((raw.result as any).condition as ProducerPlantCondition) : undefined,
    nutrientN: (raw.result as any)?.nutrientN !== undefined ? Number((raw.result as any)?.nutrientN) : undefined,
    nutrientP: (raw.result as any)?.nutrientP !== undefined ? Number((raw.result as any)?.nutrientP) : undefined,
    nutrientK: (raw.result as any)?.nutrientK !== undefined ? Number((raw.result as any)?.nutrientK) : undefined,
    nutrientIndex: (raw.result as any)?.nutrientIndex !== undefined ? Number((raw.result as any)?.nutrientIndex) : undefined,
    estimatedProductivityKgHa:
      (raw.result as any)?.estimatedProductivityKgHa !== undefined
        ? Number((raw.result as any)?.estimatedProductivityKgHa)
        : undefined,
    recommendedNpk: (raw.result as any)?.recommendedNpk ? String((raw.result as any)?.recommendedNpk) : undefined,
    season: (raw.result as any)?.season ? ((raw.result as any).season as CropSeason) : undefined,
    rainfallMm: (raw.result as any)?.rainfallMm !== undefined ? Number((raw.result as any)?.rainfallMm) : undefined,
    region: (raw.result as any)?.region ? ((raw.result as any).region as PublicClimateRegion) : undefined,
  },
});

export const aiAnalysisService = {
  async listAnalyses(): Promise<AIAnalysisRecord[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(analysesCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs.map((docSnapshot: any) =>
      toAnalysisRecord(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },

  async runAnalysis(params?: { imageName?: string; context?: AIAnalysisContext }): Promise<AIAnalysisResult> {
    const result = await backendApi.analyzeImage({
      imageName: params?.imageName ?? 'imagem-sem-nome',
      context: params?.context,
    });
    return {
      diagnosis: result.diagnosis,
      confidence: result.confidence,
      recommendation: result.recommendation,
      action: result.action,
      product: result.product,
      stage: result.stage,
      condition: result.condition,
      nutrientN: result.nutrientN,
      nutrientP: result.nutrientP,
      nutrientK: result.nutrientK,
      nutrientIndex: result.nutrientIndex,
      estimatedProductivityKgHa: result.estimatedProductivityKgHa,
      recommendedNpk: result.recommendedNpk,
      season: result.season,
      rainfallMm: result.rainfallMm,
      region: result.region,
    };
  },
};
