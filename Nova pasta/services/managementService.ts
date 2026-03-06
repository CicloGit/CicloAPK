import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ManagementAlert, ManagementRecord } from '../types';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const alertsCollection = collection(db, 'managementAlerts');
const historyCollection = collection(db, 'managementHistory');

const toAlert = (id: string, raw: Record<string, unknown>): ManagementAlert => ({
  id,
  target: String(raw.target ?? ''),
  type: (raw.type as ManagementAlert['type']) ?? 'Nutrition',
  message: String(raw.message ?? ''),
  reason: String(raw.reason ?? ''),
  severity: (raw.severity as ManagementAlert['severity']) ?? 'INFO',
  dueDate: String(raw.dueDate ?? ''),
});

const toHistory = (id: string, raw: Record<string, unknown>): ManagementRecord => ({
  id,
  date: String(raw.date ?? ''),
  target: String(raw.target ?? ''),
  actionType: String(raw.actionType ?? ''),
  product: String(raw.product ?? ''),
  quantity: String(raw.quantity ?? ''),
  executor: String(raw.executor ?? ''),
  targetType: raw.targetType ? (String(raw.targetType) as ManagementRecord['targetType']) : undefined,
  pastureId: raw.pastureId ? String(raw.pastureId) : undefined,
  lotId: raw.lotId ? String(raw.lotId) : undefined,
  animalId: raw.animalId ? String(raw.animalId) : undefined,
  cultureId: raw.cultureId ? String(raw.cultureId) : undefined,
  soilType: raw.soilType ? (String(raw.soilType) as ManagementRecord['soilType']) : undefined,
  climateRegion: raw.climateRegion ? (String(raw.climateRegion) as ManagementRecord['climateRegion']) : undefined,
  season: raw.season ? (String(raw.season) as ManagementRecord['season']) : undefined,
  rainfallMm: raw.rainfallMm !== undefined && raw.rainfallMm !== null ? Number(raw.rainfallMm) : undefined,
  fertilizationKgHa:
    raw.fertilizationKgHa !== undefined && raw.fertilizationKgHa !== null ? Number(raw.fertilizationKgHa) : undefined,
  animalHandlingDays:
    raw.animalHandlingDays !== undefined && raw.animalHandlingDays !== null ? Number(raw.animalHandlingDays) : undefined,
  estimatedProductivityKgHa:
    raw.estimatedProductivityKgHa !== undefined && raw.estimatedProductivityKgHa !== null
      ? Number(raw.estimatedProductivityKgHa)
      : undefined,
  estimatedNutrientIndex:
    raw.estimatedNutrientIndex !== undefined && raw.estimatedNutrientIndex !== null
      ? Number(raw.estimatedNutrientIndex)
      : undefined,
  recommendations: Array.isArray(raw.recommendations)
    ? raw.recommendations.map((item) => String(item))
    : undefined,
});

export const managementService = {
  async listAlerts(): Promise<ManagementAlert[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(alertsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .filter((docSnapshot: any) => !(docSnapshot.data() as Record<string, unknown>).resolved)
      .map((docSnapshot: any) => toAlert(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listHistory(): Promise<ManagementRecord[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(historyCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => toHistory(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ManagementRecord, b: ManagementRecord) => b.date.localeCompare(a.date));
  },

  async createHistoryRecord(data: Omit<ManagementRecord, 'id' | 'date'>): Promise<ManagementRecord> {
    const context = await resolveTenantContext();
    const newRecord: ManagementRecord = {
      id: `HIST-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
      target: data.target,
      actionType: data.actionType,
      product: data.product,
      quantity: data.quantity,
      executor: data.executor,
      targetType: data.targetType,
      pastureId: data.pastureId,
      lotId: data.lotId,
      animalId: data.animalId,
      cultureId: data.cultureId,
      soilType: data.soilType,
      climateRegion: data.climateRegion,
      season: data.season,
      rainfallMm: data.rainfallMm,
      fertilizationKgHa: data.fertilizationKgHa,
      animalHandlingDays: data.animalHandlingDays,
      estimatedProductivityKgHa: data.estimatedProductivityKgHa,
      estimatedNutrientIndex: data.estimatedNutrientIndex,
      recommendations: data.recommendations,
    };

    await setDoc(
      doc(db, 'managementHistory', newRecord.id),
      withTenantFields(
        {
          ...newRecord,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return newRecord;
  },

  async resolveAlert(alertId: string): Promise<void> {
    const context = await resolveTenantContext();
    const alertRef = doc(db, 'managementAlerts', alertId);
    const snapshot = await getDoc(alertRef);
    if (!snapshot.exists()) {
      throw new Error('Alerta nao encontrado.');
    }
    if (!hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para atualizar alerta de outro tenant.');
    }

    await setDoc(
      alertRef,
      withTenantFields(
        {
          resolved: true,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );
  },
};
