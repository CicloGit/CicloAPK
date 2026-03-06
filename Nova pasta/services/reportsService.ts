import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MarketTrend } from '../types';
import { immutableAuditService } from './immutableAuditService';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

export interface ConsumptionReportRow {
  id: string;
  lotId?: string;
  product: string;
  total: string;
  avgPerAnimal: string;
  dailyAvg: string;
  costPerHead: string;
}

export interface CapacityReport {
  cycleStart: string;
  projectedEnd: string;
  daysElapsed: number;
  totalDays: number;
  efficiency: number;
  animalsIn: number;
  mortality: number;
  projectedWeight: string;
  currentWeight: string;
}

export interface LotAuditReading {
  id: string;
  lotId: string;
  lotName: string;
  checkedHeadcount: number;
  checkedWeightKg: number;
  notes?: string;
  evidenceReference: string;
  createdAt: string;
  immutableAuditHash?: string;
}

const marketTrendsCollection = collection(db, 'marketTrends');
const consumptionCollection = collection(db, 'reportConsumptions');
const capacityCollection = collection(db, 'reportCapacity');
const lotAuditsCollection = collection(db, 'reportLotAudits');

const toMarketTrend = (id: string, raw: Record<string, unknown>): MarketTrend => ({
  commodity: String(raw.commodity ?? id),
  price: Number(raw.price ?? 0),
  unit: String(raw.unit ?? ''),
  trend: (raw.trend as MarketTrend['trend']) ?? 'stable',
  change: String(raw.change ?? ''),
});

const toConsumptionRow = (id: string, raw: Record<string, unknown>): ConsumptionReportRow => ({
  id,
  lotId: raw.lotId ? String(raw.lotId) : undefined,
  product: String(raw.product ?? ''),
  total: String(raw.total ?? ''),
  avgPerAnimal: String(raw.avgPerAnimal ?? ''),
  dailyAvg: String(raw.dailyAvg ?? ''),
  costPerHead: String(raw.costPerHead ?? ''),
});

const toCapacityReport = (raw: Record<string, unknown>): CapacityReport => ({
  cycleStart: String(raw.cycleStart ?? ''),
  projectedEnd: String(raw.projectedEnd ?? ''),
  daysElapsed: Number(raw.daysElapsed ?? 0),
  totalDays: Number(raw.totalDays ?? 0),
  efficiency: Number(raw.efficiency ?? 0),
  animalsIn: Number(raw.animalsIn ?? 0),
  mortality: Number(raw.mortality ?? 0),
  projectedWeight: String(raw.projectedWeight ?? ''),
  currentWeight: String(raw.currentWeight ?? ''),
});

const toLotAuditReading = (id: string, raw: Record<string, unknown>): LotAuditReading => ({
  id,
  lotId: String(raw.lotId ?? ''),
  lotName: String(raw.lotName ?? ''),
  checkedHeadcount: Number(raw.checkedHeadcount ?? 0),
  checkedWeightKg: Number(raw.checkedWeightKg ?? 0),
  notes: raw.notes ? String(raw.notes) : undefined,
  evidenceReference: String(raw.evidenceReference ?? ''),
  createdAt: String(raw.createdAt ?? new Date().toISOString()),
  immutableAuditHash: raw.immutableAuditHash ? String(raw.immutableAuditHash) : undefined,
});

export const reportsService = {
  async listMarketTrends(): Promise<MarketTrend[]> {
    const snapshot = await getDocs(marketTrendsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toMarketTrend(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: MarketTrend, b: MarketTrend) => a.commodity.localeCompare(b.commodity));
  },

  async listConsumptionRows(lotId?: string): Promise<ConsumptionReportRow[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(consumptionCollection, where('tenantId', '==', context.tenantId)));
    const rows = snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, row: toConsumptionRow(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { row: ConsumptionReportRow }) => item.row);

    const filtered = lotId ? rows.filter((row: ConsumptionReportRow) => row.lotId === lotId || !row.lotId) : rows;
    return filtered.sort((a: ConsumptionReportRow, b: ConsumptionReportRow) => a.product.localeCompare(b.product));
  },

  async getCapacityReport(): Promise<CapacityReport | null> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(capacityCollection, where('tenantId', '==', context.tenantId), limit(1)));
    if (snapshot.empty) {
      return null;
    }
    return toCapacityReport(snapshot.docs[0].data() as Record<string, unknown>);
  },

  async listLotAuditReadings(lotId?: string): Promise<LotAuditReading[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(lotAuditsCollection, where('tenantId', '==', context.tenantId)));
    const rows = snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, reading: toLotAuditReading(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { reading: LotAuditReading }) => item.reading);

    return rows
      .filter((reading: LotAuditReading) => (lotId ? reading.lotId === lotId : true))
      .sort((a: LotAuditReading, b: LotAuditReading) => b.createdAt.localeCompare(a.createdAt));
  },

  async createLotAuditReading(params: {
    actor: string;
    lotId: string;
    lotName: string;
    checkedHeadcount: number;
    checkedWeightKg: number;
    notes?: string;
    evidenceReference: string;
  }): Promise<LotAuditReading> {
    if (!params.lotId.trim() || !params.lotName.trim()) {
      throw new Error('Selecione o lote antes de iniciar leitura de auditoria.');
    }
    if (!params.evidenceReference.trim()) {
      throw new Error('Leitura de auditoria exige evidencia digital (QR/foto/video/hash).');
    }

    const context = await resolveTenantContext();
    const createdAt = new Date().toISOString();

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'REPORT_LOT_AUDIT_READING_CREATED',
      details: `Leitura de auditoria registrada para lote ${params.lotName}.`,
      proofUrl: params.evidenceReference.trim(),
      metadata: {
        lotId: params.lotId,
        checkedHeadcount: params.checkedHeadcount,
        checkedWeightKg: params.checkedWeightKg,
      },
    });

    const created = await addDoc(
      lotAuditsCollection,
      withTenantFields(
        {
          lotId: params.lotId.trim(),
          lotName: params.lotName.trim(),
          checkedHeadcount: params.checkedHeadcount,
          checkedWeightKg: params.checkedWeightKg,
          notes: params.notes?.trim() || null,
          evidenceReference: params.evidenceReference.trim(),
          immutableAuditHash: audit.hash,
          immutable: true,
          createdAt,
          createdAtTs: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      )
    );

    return {
      id: created.id,
      lotId: params.lotId.trim(),
      lotName: params.lotName.trim(),
      checkedHeadcount: params.checkedHeadcount,
      checkedWeightKg: params.checkedWeightKg,
      notes: params.notes?.trim() || undefined,
      evidenceReference: params.evidenceReference.trim(),
      createdAt,
      immutableAuditHash: audit.hash,
    };
  },
};
