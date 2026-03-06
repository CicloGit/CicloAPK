import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  CropSeason,
  ProducerCultureAnalysisRecord,
  ProducerCultureProfile,
  ProducerCultureStage,
  ProducerPlantCondition,
  ProducerSoilType,
  PublicClimateForecast,
  PublicClimateRegion,
} from '../types';
import { publicMarketService } from './publicMarketService';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';
import { storageService } from './storageService';

const culturesCollection = collection(db, 'producerCultures');
const analysesCollection = collection(db, 'producerCultureAnalyses');

const stageOrder: ProducerCultureStage[] = [
  'SEMENTEIRA',
  'EMERGENCIA',
  'VEGETATIVO',
  'FLORACAO',
  'FRUTIFICACAO',
  'MATURACAO',
  'COLHEITA',
];

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const resolveSeason = (dateInput?: string): CropSeason => {
  const date = dateInput ? new Date(dateInput) : new Date();
  const month = date.getMonth() + 1;
  if (month >= 12 || month <= 2) return 'VERAO';
  if (month >= 3 && month <= 5) return 'OUTONO';
  if (month >= 6 && month <= 8) return 'INVERNO';
  return 'PRIMAVERA';
};

const dayDiff = (fromDate: string, toDate: Date): number => {
  const from = new Date(fromDate);
  if (Number.isNaN(from.getTime())) {
    return 0;
  }
  const ms = toDate.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const inferStageByDays = (days: number): ProducerCultureStage => {
  if (days <= 7) return 'SEMENTEIRA';
  if (days <= 20) return 'EMERGENCIA';
  if (days <= 55) return 'VEGETATIVO';
  if (days <= 85) return 'FLORACAO';
  if (days <= 115) return 'FRUTIFICACAO';
  if (days <= 145) return 'MATURACAO';
  return 'COLHEITA';
};

const soilFactorMap: Record<ProducerSoilType, number> = {
  ARGILOSO: 8,
  MISTO: 5,
  SILTOSO: 3,
  ARENOSO: -4,
};

const seasonFactorMap: Record<CropSeason, number> = {
  VERAO: 6,
  PRIMAVERA: 5,
  OUTONO: 1,
  INVERNO: -3,
};

const conditionFromNutrientIndex = (nutrientIndex: number): ProducerPlantCondition => {
  if (nutrientIndex >= 80) return 'EXCELENTE';
  if (nutrientIndex >= 65) return 'BOA';
  if (nutrientIndex >= 45) return 'ATENCAO';
  return 'CRITICA';
};

const toCulture = (id: string, raw: Record<string, unknown>): ProducerCultureProfile => ({
  id,
  name: String(raw.name ?? ''),
  species: String(raw.species ?? ''),
  pastureId: String(raw.pastureId ?? ''),
  region: (String(raw.region ?? 'SUDESTE') as PublicClimateRegion),
  soilType: (String(raw.soilType ?? 'MISTO') as ProducerSoilType),
  plantedAt: String(raw.plantedAt ?? new Date().toISOString()),
  currentStage: (String(raw.currentStage ?? 'SEMENTEIRA') as ProducerCultureStage),
  currentCondition: (String(raw.currentCondition ?? 'BOA') as ProducerPlantCondition),
  nutrientN: Number(raw.nutrientN ?? 60),
  nutrientP: Number(raw.nutrientP ?? 55),
  nutrientK: Number(raw.nutrientK ?? 60),
  nutrientIndex: Number(raw.nutrientIndex ?? 58),
  estimatedProductivityKgHa: Number(raw.estimatedProductivityKgHa ?? 0),
  lastRainMm: Number(raw.lastRainMm ?? 0),
  lastSeason: (String(raw.lastSeason ?? resolveSeason()) as CropSeason),
  lastAiConfidence: raw.lastAiConfidence !== undefined && raw.lastAiConfidence !== null ? Number(raw.lastAiConfidence) : undefined,
  lastPhotoUrl: raw.lastPhotoUrl ? String(raw.lastPhotoUrl) : undefined,
  lastPhotoHash: raw.lastPhotoHash ? String(raw.lastPhotoHash) : undefined,
  lastAnalysisAt: raw.lastAnalysisAt ? String(raw.lastAnalysisAt) : undefined,
  updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  createdAt: String(raw.createdAt ?? new Date().toLocaleString('pt-BR')),
});

const toAnalysis = (id: string, raw: Record<string, unknown>): ProducerCultureAnalysisRecord => ({
  id,
  cultureId: String(raw.cultureId ?? ''),
  cultureName: String(raw.cultureName ?? ''),
  stage: (String(raw.stage ?? 'SEMENTEIRA') as ProducerCultureStage),
  condition: (String(raw.condition ?? 'BOA') as ProducerPlantCondition),
  diagnosis: String(raw.diagnosis ?? ''),
  confidence: Number(raw.confidence ?? 0),
  recommendation: String(raw.recommendation ?? ''),
  nutrientN: Number(raw.nutrientN ?? 0),
  nutrientP: Number(raw.nutrientP ?? 0),
  nutrientK: Number(raw.nutrientK ?? 0),
  nutrientIndex: Number(raw.nutrientIndex ?? 0),
  estimatedProductivityKgHa: Number(raw.estimatedProductivityKgHa ?? 0),
  rainfallMm: Number(raw.rainfallMm ?? 0),
  season: (String(raw.season ?? resolveSeason()) as CropSeason),
  region: (String(raw.region ?? 'SUDESTE') as PublicClimateRegion),
  soilType: (String(raw.soilType ?? 'MISTO') as ProducerSoilType),
  photoUrl: raw.photoUrl ? String(raw.photoUrl) : undefined,
  photoHash: raw.photoHash ? String(raw.photoHash) : undefined,
  createdAt: String(raw.createdAt ?? new Date().toLocaleString('pt-BR')),
});

const precipitationSum = (forecast: PublicClimateForecast | null): number => {
  if (!forecast || !Array.isArray(forecast.days)) {
    return 0;
  }
  return forecast.days.slice(0, 7).reduce((sum, day) => sum + Number(day.precipitationMm ?? 0), 0);
};

const calculateCultureMetrics = (params: {
  stage: ProducerCultureStage;
  soilType: ProducerSoilType;
  rainfallMm: number;
  season: CropSeason;
  fertilizationKgHa?: number;
  animalHandlingDays?: number;
}): {
  nutrientN: number;
  nutrientP: number;
  nutrientK: number;
  nutrientIndex: number;
  estimatedProductivityKgHa: number;
  condition: ProducerPlantCondition;
} => {
  const stageIdx = stageOrder.findIndex((stage) => stage === params.stage);
  const stageFactor = stageIdx < 0 ? 0 : stageIdx * 2.8;
  const rainFactor = clamp(params.rainfallMm, 0, 160) / 12;
  const fertilizerFactor = clamp(Number(params.fertilizationKgHa ?? 0), 0, 400) / 20;
  const animalFactor = clamp(Number(params.animalHandlingDays ?? 0), 0, 60) * 0.3;
  const soilFactor = soilFactorMap[params.soilType] ?? 0;
  const seasonFactor = seasonFactorMap[params.season] ?? 0;

  const nutrientIndex = clamp(42 + soilFactor + seasonFactor + rainFactor + fertilizerFactor + animalFactor - stageFactor * 0.3, 0, 100);
  const nutrientN = clamp(nutrientIndex + fertilizerFactor * 1.4 - 4, 0, 100);
  const nutrientP = clamp(nutrientIndex + soilFactor * 0.8 - 6, 0, 100);
  const nutrientK = clamp(nutrientIndex + rainFactor * 0.9 - 2, 0, 100);
  const estimatedProductivityKgHa = Number(
    clamp(1400 + nutrientIndex * 42 + rainFactor * 28 + fertilizerFactor * 36 + seasonFactor * 22, 600, 12500).toFixed(0)
  );
  const condition = conditionFromNutrientIndex(nutrientIndex);

  return {
    nutrientN: Number(nutrientN.toFixed(1)),
    nutrientP: Number(nutrientP.toFixed(1)),
    nutrientK: Number(nutrientK.toFixed(1)),
    nutrientIndex: Number(nutrientIndex.toFixed(1)),
    estimatedProductivityKgHa,
    condition,
  };
};

export const cropIntelligenceService = {
  async listCultures(): Promise<ProducerCultureProfile[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(culturesCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, culture: toCulture(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { culture: ProducerCultureProfile }) => item.culture)
      .sort((a: ProducerCultureProfile, b: ProducerCultureProfile) => a.name.localeCompare(b.name));
  },

  async createCulture(payload: {
    name: string;
    species: string;
    pastureId: string;
    region: PublicClimateRegion;
    soilType: ProducerSoilType;
    plantedAt: string;
  }): Promise<ProducerCultureProfile> {
    if (!payload.name.trim() || !payload.species.trim() || !payload.pastureId.trim()) {
      throw new Error('Informe nome, especie e talhao/pasto da cultura.');
    }

    const context = await resolveTenantContext();
    const season = resolveSeason(payload.plantedAt);
    const baseMetrics = calculateCultureMetrics({
      stage: 'SEMENTEIRA',
      soilType: payload.soilType,
      rainfallMm: 0,
      season,
      fertilizationKgHa: 0,
      animalHandlingDays: 0,
    });

    const culture: ProducerCultureProfile = {
      id: `CULT-${Date.now()}`,
      name: payload.name.trim(),
      species: payload.species.trim(),
      pastureId: payload.pastureId.trim(),
      region: payload.region,
      soilType: payload.soilType,
      plantedAt: payload.plantedAt,
      currentStage: 'SEMENTEIRA',
      currentCondition: baseMetrics.condition,
      nutrientN: baseMetrics.nutrientN,
      nutrientP: baseMetrics.nutrientP,
      nutrientK: baseMetrics.nutrientK,
      nutrientIndex: baseMetrics.nutrientIndex,
      estimatedProductivityKgHa: baseMetrics.estimatedProductivityKgHa,
      lastRainMm: 0,
      lastSeason: season,
      createdAt: new Date().toLocaleString('pt-BR'),
    };

    await setDoc(
      doc(db, 'producerCultures', culture.id),
      withTenantFields(
        {
          ...culture,
          createdAtTs: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return culture;
  },

  async listCultureAnalyses(cultureId?: string): Promise<ProducerCultureAnalysisRecord[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(analysesCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, analysis: toAnalysis(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown>; analysis: ProducerCultureAnalysisRecord }) => {
        if (!hasTenantAccess(item.raw, context)) {
          return false;
        }
        if (!cultureId) {
          return true;
        }
        return item.analysis.cultureId === cultureId;
      })
      .map((item: { analysis: ProducerCultureAnalysisRecord }) => item.analysis)
      .sort((a: ProducerCultureAnalysisRecord, b: ProducerCultureAnalysisRecord) => b.createdAt.localeCompare(a.createdAt));
  },

  async registerCulturePhotoAnalysis(params: {
    culture: ProducerCultureProfile;
    photoFile: File;
    diagnosis: string;
    confidence: number;
    recommendation: string;
    stage: ProducerCultureStage;
    condition: ProducerPlantCondition;
    nutrientN: number;
    nutrientP: number;
    nutrientK: number;
    nutrientIndex: number;
    estimatedProductivityKgHa: number;
    rainfallMm: number;
    season: CropSeason;
    region: PublicClimateRegion;
    soilType: ProducerSoilType;
  }): Promise<ProducerCultureAnalysisRecord> {
    const context = await resolveTenantContext();
    const evidenceId = `crop-photo-${Date.now()}`;
    const uploaded = await storageService.uploadEvidenceFile(
      params.photoFile,
      context.tenantId,
      `culture-${params.culture.id}`,
      evidenceId
    );

    const analysis: ProducerCultureAnalysisRecord = {
      id: `CULT-AN-${Date.now()}`,
      cultureId: params.culture.id,
      cultureName: params.culture.name,
      stage: params.stage,
      condition: params.condition,
      diagnosis: params.diagnosis,
      confidence: params.confidence,
      recommendation: params.recommendation,
      nutrientN: Number(params.nutrientN.toFixed(1)),
      nutrientP: Number(params.nutrientP.toFixed(1)),
      nutrientK: Number(params.nutrientK.toFixed(1)),
      nutrientIndex: Number(params.nutrientIndex.toFixed(1)),
      estimatedProductivityKgHa: Number(params.estimatedProductivityKgHa.toFixed(0)),
      rainfallMm: Number(params.rainfallMm.toFixed(1)),
      season: params.season,
      region: params.region,
      soilType: params.soilType,
      photoUrl: uploaded.url,
      photoHash: uploaded.hash,
      createdAt: new Date().toLocaleString('pt-BR'),
    };

    await Promise.all([
      setDoc(
        doc(db, 'producerCultureAnalyses', analysis.id),
        withTenantFields(
          {
            ...analysis,
            createdAtTs: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          context
        ),
        { merge: true }
      ),
      setDoc(
        doc(db, 'producerCultures', params.culture.id),
        withTenantFields(
          {
            currentStage: analysis.stage,
            currentCondition: analysis.condition,
            nutrientN: analysis.nutrientN,
            nutrientP: analysis.nutrientP,
            nutrientK: analysis.nutrientK,
            nutrientIndex: analysis.nutrientIndex,
            estimatedProductivityKgHa: analysis.estimatedProductivityKgHa,
            lastRainMm: analysis.rainfallMm,
            lastSeason: analysis.season,
            lastAiConfidence: analysis.confidence,
            lastPhotoUrl: analysis.photoUrl,
            lastPhotoHash: analysis.photoHash,
            lastAnalysisAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          },
          context
        ),
        { merge: true }
      ),
    ]);

    return analysis;
  },

  async autoUpdateCulturesByClimate(): Promise<ProducerCultureProfile[]> {
    const context = await resolveTenantContext();
    const cultures = await this.listCultures();
    if (cultures.length === 0) {
      return [];
    }

    const distinctRegions = Array.from(new Set<PublicClimateRegion>(cultures.map((culture) => culture.region)));
    const forecastsByRegion = new Map<PublicClimateRegion, PublicClimateForecast | null>();

    await Promise.all(
      distinctRegions.map(async (region) => {
        try {
          const forecast = await publicMarketService.getClimateForecast(region);
          forecastsByRegion.set(region, forecast);
        } catch {
          forecastsByRegion.set(region, null);
        }
      })
    );

    const updates = cultures.map((culture) => {
      const forecast = forecastsByRegion.get(culture.region) ?? null;
      const rainMm = precipitationSum(forecast);
      const now = new Date();
      const season = resolveSeason(now.toISOString());
      const daysFromPlanting = dayDiff(culture.plantedAt, now);
      const nextStage = inferStageByDays(daysFromPlanting);

      const metrics = calculateCultureMetrics({
        stage: nextStage,
        soilType: culture.soilType,
        rainfallMm: rainMm,
        season,
        fertilizationKgHa: 0,
        animalHandlingDays: 0,
      });

      const nextCulture: ProducerCultureProfile = {
        ...culture,
        currentStage: nextStage,
        currentCondition: metrics.condition,
        nutrientN: metrics.nutrientN,
        nutrientP: metrics.nutrientP,
        nutrientK: metrics.nutrientK,
        nutrientIndex: metrics.nutrientIndex,
        estimatedProductivityKgHa: metrics.estimatedProductivityKgHa,
        lastRainMm: Number(rainMm.toFixed(1)),
        lastSeason: season,
        updatedAt: new Date().toISOString(),
      };

      return nextCulture;
    });

    await Promise.all(
      updates.map((culture) =>
        setDoc(
          doc(db, 'producerCultures', culture.id),
          withTenantFields(
            {
              currentStage: culture.currentStage,
              currentCondition: culture.currentCondition,
              nutrientN: culture.nutrientN,
              nutrientP: culture.nutrientP,
              nutrientK: culture.nutrientK,
              nutrientIndex: culture.nutrientIndex,
              estimatedProductivityKgHa: culture.estimatedProductivityKgHa,
              lastRainMm: culture.lastRainMm,
              lastSeason: culture.lastSeason,
              updatedAt: serverTimestamp(),
            },
            context
          ),
          { merge: true }
        )
      )
    );

    return updates;
  },

  resolveSeason(dateInput?: string): CropSeason {
    return resolveSeason(dateInput);
  },

  calculateCultureMetrics,
};
