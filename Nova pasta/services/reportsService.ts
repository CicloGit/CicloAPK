import {
  collection,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MarketTrend } from '../types';

export interface ConsumptionReportRow {
  id: string;
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

const marketTrendsCollection = collection(db, 'marketTrends');
const consumptionCollection = collection(db, 'reportConsumptions');
const capacityCollection = collection(db, 'reportCapacity');

const toMarketTrend = (id: string, raw: Record<string, unknown>): MarketTrend => ({
  commodity: String(raw.commodity ?? id),
  price: Number(raw.price ?? 0),
  unit: String(raw.unit ?? ''),
  trend: (raw.trend as MarketTrend['trend']) ?? 'stable',
  change: String(raw.change ?? ''),
});

const toConsumptionRow = (id: string, raw: Record<string, unknown>): ConsumptionReportRow => ({
  id,
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

export const reportsService = {
  async listMarketTrends(): Promise<MarketTrend[]> {
    const snapshot = await getDocs(marketTrendsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toMarketTrend(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: MarketTrend, b: MarketTrend) => a.commodity.localeCompare(b.commodity));
  },

  async listConsumptionRows(): Promise<ConsumptionReportRow[]> {
    const snapshot = await getDocs(consumptionCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toConsumptionRow(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ConsumptionReportRow, b: ConsumptionReportRow) => a.product.localeCompare(b.product));
  },

  async getCapacityReport(): Promise<CapacityReport | null> {
    const snapshot = await getDoc(doc(db, 'reportCapacity', 'current'));
    if (!snapshot.exists()) {
      return null;
    }
    return toCapacityReport(snapshot.data() as Record<string, unknown>);
  },
};
