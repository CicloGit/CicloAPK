import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  mockAuctionListings,
  mockMarketSaturation,
  mockMarketTrends,
  mockNewsItems,
  mockRegionalStats,
} from '../constants';
import { db } from '../config/firebase';
import { AggregatedStat, AuctionListing, MarketSaturation, MarketTrend, NewsItem } from '../types';

const marketTrendsCollection = collection(db, 'marketTrends');
const regionalStatsCollection = collection(db, 'regionalStats');
const newsCollection = collection(db, 'newsItems');
const auctionsCollection = collection(db, 'auctionListings');
const saturationCollection = collection(db, 'marketSaturation');

let seeded = false;

const toMarketTrend = (id: string, raw: Record<string, unknown>): MarketTrend => ({
  commodity: String(raw.commodity ?? id),
  price: Number(raw.price ?? 0),
  unit: String(raw.unit ?? ''),
  trend: (raw.trend as MarketTrend['trend']) ?? 'stable',
  change: String(raw.change ?? ''),
});

const toRegionalStat = (id: string, raw: Record<string, unknown>): AggregatedStat => ({
  label: String(raw.label ?? id),
  value: String(raw.value ?? ''),
  description: String(raw.description ?? ''),
});

const toNewsItem = (id: string, raw: Record<string, unknown>): NewsItem => ({
  id,
  title: String(raw.title ?? ''),
  summary: String(raw.summary ?? ''),
  source: String(raw.source ?? ''),
  date: String(raw.date ?? ''),
  category: (raw.category as NewsItem['category']) ?? 'Mercado',
});

const toAuctionListing = (id: string, raw: Record<string, unknown>): AuctionListing => ({
  id,
  title: String(raw.title ?? ''),
  date: String(raw.date ?? ''),
  location: String(raw.location ?? ''),
  category: String(raw.category ?? ''),
  lotCount: Number(raw.lotCount ?? 0),
  organizer: String(raw.organizer ?? ''),
  status: (raw.status as AuctionListing['status']) ?? 'Agendado',
});

const toMarketSaturation = (id: string, raw: Record<string, unknown>): MarketSaturation => ({
  id,
  commodity: String(raw.commodity ?? ''),
  totalDemand: Number(raw.totalDemand ?? 0),
  currentProduction: Number(raw.currentProduction ?? 0),
  unit: String(raw.unit ?? ''),
  riskLevel: (raw.riskLevel as MarketSaturation['riskLevel']) ?? 'Balanced',
  projectedPriceDrop: String(raw.projectedPriceDrop ?? ''),
  maxSafePrice: Number(raw.maxSafePrice ?? 0),
  averageContractPrice: Number(raw.averageContractPrice ?? 0),
  averageRealizedPrice: Number(raw.averageRealizedPrice ?? 0),
  marketAveragePrice: Number(raw.marketAveragePrice ?? 0),
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(marketTrendsCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockMarketTrends.map((trend) =>
      setDoc(doc(db, 'marketTrends', trend.commodity), {
        ...trend,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockRegionalStats.map((stat, index) =>
      setDoc(doc(db, 'regionalStats', `STAT-${index + 1}`), {
        ...stat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockNewsItems.map((item) =>
      setDoc(doc(db, 'newsItems', item.id), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockAuctionListings.map((item) =>
      setDoc(doc(db, 'auctionListings', item.id), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockMarketSaturation.map((item) =>
      setDoc(doc(db, 'marketSaturation', item.id), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const publicMarketService = {
  async listMarketTrends(): Promise<MarketTrend[]> {
    await ensureSeedData();
    const snapshot = await getDocs(marketTrendsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toMarketTrend(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: MarketTrend, b: MarketTrend) => a.commodity.localeCompare(b.commodity));
  },

  async listRegionalStats(): Promise<AggregatedStat[]> {
    await ensureSeedData();
    const snapshot = await getDocs(regionalStatsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toRegionalStat(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listNewsItems(): Promise<NewsItem[]> {
    await ensureSeedData();
    const snapshot = await getDocs(newsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toNewsItem(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: NewsItem, b: NewsItem) => a.date.localeCompare(b.date));
  },

  async listAuctionListings(): Promise<AuctionListing[]> {
    await ensureSeedData();
    const snapshot = await getDocs(auctionsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toAuctionListing(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listMarketSaturation(): Promise<MarketSaturation[]> {
    await ensureSeedData();
    const snapshot = await getDocs(saturationCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toMarketSaturation(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};
