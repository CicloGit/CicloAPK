import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockMarketTrends } from '../constants';
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

let seeded = false;

const seedConsumptionRows: ConsumptionReportRow[] = [
  { id: 'CONS-001', product: 'Racao Crescimento', total: '1.200 kg', avgPerAnimal: '10 kg', dailyAvg: '0.5 kg', costPerHead: 'R$ 22,00' },
  { id: 'CONS-002', product: 'Sal Mineral 80', total: '240 kg', avgPerAnimal: '2 kg', dailyAvg: '0.1 kg', costPerHead: 'R$ 8,50' },
  { id: 'CONS-003', product: 'Vacina Aftosa', total: '120 doses', avgPerAnimal: '1 dose', dailyAvg: '-', costPerHead: 'R$ 4,20' },
];

const seedCapacity: CapacityReport = {
  cycleStart: '15/01/2024',
  projectedEnd: '15/11/2024',
  daysElapsed: 145,
  totalDays: 300,
  efficiency: 92,
  animalsIn: 120,
  mortality: 1,
  projectedWeight: '450 kg',
  currentWeight: '320 kg',
};

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

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const [trendSnapshot, consumptionSnapshot, capacitySnapshot] = await Promise.all([
    getDocs(query(marketTrendsCollection, limit(1))),
    getDocs(query(consumptionCollection, limit(1))),
    getDocs(query(capacityCollection, limit(1))),
  ]);

  if (trendSnapshot.empty) {
    await Promise.all(
      mockMarketTrends.map((trend) =>
        setDoc(doc(db, 'marketTrends', trend.commodity), {
          ...trend,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    );
  }

  if (consumptionSnapshot.empty) {
    await Promise.all(
      seedConsumptionRows.map((row) =>
        setDoc(doc(db, 'reportConsumptions', row.id), {
          ...row,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    );
  }

  if (capacitySnapshot.empty) {
    await setDoc(doc(db, 'reportCapacity', 'current'), {
      ...seedCapacity,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  seeded = true;
}

export const reportsService = {
  async listMarketTrends(): Promise<MarketTrend[]> {
    await ensureSeedData();
    const snapshot = await getDocs(marketTrendsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toMarketTrend(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: MarketTrend, b: MarketTrend) => a.commodity.localeCompare(b.commodity));
  },

  async listConsumptionRows(): Promise<ConsumptionReportRow[]> {
    await ensureSeedData();
    const snapshot = await getDocs(consumptionCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toConsumptionRow(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ConsumptionReportRow, b: ConsumptionReportRow) => a.product.localeCompare(b.product));
  },

  async getCapacityReport(): Promise<CapacityReport | null> {
    await ensureSeedData();
    const snapshot = await getDoc(doc(db, 'reportCapacity', 'current'));
    if (!snapshot.exists()) {
      return null;
    }
    return toCapacityReport(snapshot.data() as Record<string, unknown>);
  },
};
