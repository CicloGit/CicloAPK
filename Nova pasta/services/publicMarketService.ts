import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  AggregatedStat,
  AuctionListing,
  ExternalMarketBenchmark,
  ExternalMarketBenchmarkItem,
  ExternalNewsDigest,
  ExternalNewsDigestItem,
  MarketSaturation,
  MarketTrend,
  NewsItem,
  PublicClimateForecast,
  PublicClimateRegion,
  PublicInputCostIndex,
  PublicMarketPriceCategory,
  PublicMarketPriceItem,
  PublicMarketSummary,
} from '../types';
import {
  backendApi,
  ExternalMarketBenchmarkPayload,
  ExternalNewsDigestPayload,
  PublicClimateForecastPayload,
  PublicInputCostIndexPayload,
  PublicMarketPricePayload,
  PublicMarketSummaryPayload,
} from './backendApi';

const marketTrendsCollection = collection(db, 'marketTrends');
const regionalStatsCollection = collection(db, 'regionalStats');
const newsCollection = collection(db, 'newsItems');
const auctionsCollection = collection(db, 'auctionListings');
const saturationCollection = collection(db, 'marketSaturation');

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

const toPublicMarketPrice = (raw: PublicMarketPricePayload): PublicMarketPriceItem => ({
  symbol: String(raw.symbol ?? ''),
  category: raw.category,
  name: String(raw.name ?? raw.symbol ?? ''),
  unit: String(raw.unit ?? ''),
  currency: String(raw.currency ?? 'BRL'),
  price: Number(raw.price ?? 0),
  change1d: Number(raw.change1d ?? 0),
  change7d: Number(raw.change7d ?? 0),
  change30d: Number(raw.change30d ?? 0),
  source: raw.source,
  sourceRef: raw.sourceRef,
  region: raw.region,
  updatedAt: raw.updatedAt ?? null,
});

const toPublicInputCostIndex = (raw: PublicInputCostIndexPayload | null): PublicInputCostIndex | null => {
  if (!raw) {
    return null;
  }

  return {
    window7d: Number(raw.window7d ?? 0),
    window30d: Number(raw.window30d ?? 0),
    componentsUsed: Array.isArray(raw.componentsUsed)
      ? raw.componentsUsed.map((component) => ({
          symbol: String(component.symbol ?? ''),
          weight: Number(component.weight ?? 0),
          change7d: Number(component.change7d ?? 0),
          change30d: Number(component.change30d ?? 0),
        }))
      : [],
    staleComponents: Array.isArray(raw.staleComponents) ? raw.staleComponents.map((value) => String(value)) : [],
    updatedAt: raw.updatedAt ?? null,
  };
};

const toPublicMarketSummary = (raw: PublicMarketSummaryPayload): PublicMarketSummary => ({
  updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  countsByCategory: {
    COMMODITY: Number(raw.countsByCategory?.COMMODITY ?? 0),
    LIVESTOCK: Number(raw.countsByCategory?.LIVESTOCK ?? 0),
    INPUT: Number(raw.countsByCategory?.INPUT ?? 0),
  },
  topCommodities: Array.isArray(raw.topCommodities) ? raw.topCommodities.map(toPublicMarketPrice) : [],
  topLivestock: Array.isArray(raw.topLivestock) ? raw.topLivestock.map(toPublicMarketPrice) : [],
  topInputs: Array.isArray(raw.topInputs) ? raw.topInputs.map(toPublicMarketPrice) : [],
  inputCostIndex: toPublicInputCostIndex(raw.inputCostIndex),
});

const toExternalMarketBenchmarkItem = (raw: ExternalMarketBenchmarkPayload['items'][number]): ExternalMarketBenchmarkItem => ({
  id: String(raw.id ?? ''),
  symbol: String(raw.symbol ?? ''),
  name: String(raw.name ?? ''),
  category: (raw.category as ExternalMarketBenchmarkItem['category']) ?? 'COMMODITY',
  unit: String(raw.unit ?? ''),
  currency: String(raw.currency ?? 'BRL'),
  internalPrice: raw.internalPrice === null ? null : Number(raw.internalPrice ?? 0),
  externalAveragePrice: Number(raw.externalAveragePrice ?? 0),
  spreadPct: raw.spreadPct === null ? null : Number(raw.spreadPct ?? 0),
  externalSampleSize: Number(raw.externalSampleSize ?? 0),
  updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
});

const toExternalMarketBenchmark = (raw: ExternalMarketBenchmarkPayload): ExternalMarketBenchmark => ({
  updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  internalDataAvailable: raw.internalDataAvailable === true,
  stale: raw.stale === true,
  items: Array.isArray(raw.items) ? raw.items.map(toExternalMarketBenchmarkItem) : [],
});

const toExternalNewsDigestItem = (raw: ExternalNewsDigestPayload['items'][number]): ExternalNewsDigestItem => ({
  id: String(raw.id ?? ''),
  title: String(raw.title ?? ''),
  summary: String(raw.summary ?? ''),
  date: String(raw.date ?? ''),
  category: 'Mercado',
  sourceLabel: String(raw.sourceLabel ?? 'Fonte externa verificada'),
  link: String(raw.link ?? ''),
});

const toExternalNewsDigest = (raw: ExternalNewsDigestPayload): ExternalNewsDigest => ({
  updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  stale: raw.stale === true,
  items: Array.isArray(raw.items) ? raw.items.map(toExternalNewsDigestItem) : [],
});

const toPublicClimateForecast = (raw: PublicClimateForecastPayload): PublicClimateForecast => ({
  region: raw.region,
  regionLabel: String(raw.regionLabel ?? raw.region ?? ''),
  referenceCity: String(raw.referenceCity ?? ''),
  updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  stale: raw.stale === true,
  days: Array.isArray(raw.days)
    ? raw.days.map((item) => ({
        date: String(item.date ?? ''),
        tempMinC: Number(item.tempMinC ?? 0),
        tempMaxC: Number(item.tempMaxC ?? 0),
        precipitationProbabilityPct: Number(item.precipitationProbabilityPct ?? 0),
        precipitationMm: Number(item.precipitationMm ?? 0),
        windMaxKmh: Number(item.windMaxKmh ?? 0),
      }))
    : [],
});

export const publicMarketService = {
  async listMarketTrends(): Promise<MarketTrend[]> {
    const snapshot = await getDocs(marketTrendsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toMarketTrend(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: MarketTrend, b: MarketTrend) => a.commodity.localeCompare(b.commodity));
  },

  async listRegionalStats(): Promise<AggregatedStat[]> {
    const snapshot = await getDocs(regionalStatsCollection);
    return snapshot.docs.map((docSnapshot: any) => toRegionalStat(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listNewsItems(): Promise<NewsItem[]> {
    const snapshot = await getDocs(newsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toNewsItem(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: NewsItem, b: NewsItem) => a.date.localeCompare(b.date));
  },

  async listAuctionListings(): Promise<AuctionListing[]> {
    const snapshot = await getDocs(auctionsCollection);
    return snapshot.docs.map((docSnapshot: any) => toAuctionListing(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listMarketSaturation(): Promise<MarketSaturation[]> {
    const snapshot = await getDocs(saturationCollection);
    return snapshot.docs.map((docSnapshot: any) => toMarketSaturation(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async getPublicMarketSummary(): Promise<PublicMarketSummary> {
    const payload = await backendApi.publicMarketSummary();
    return toPublicMarketSummary(payload);
  },

  async listPublicMarketPrices(category?: PublicMarketPriceCategory): Promise<PublicMarketPriceItem[]> {
    const payload = await backendApi.publicMarketPrices(category);
    const items = Array.isArray(payload.items) ? payload.items.map(toPublicMarketPrice) : [];
    return items.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getInputCostIndex(): Promise<PublicInputCostIndex | null> {
    const payload = await backendApi.publicInputCostIndex();
    return toPublicInputCostIndex(payload);
  },

  async getExternalMarketBenchmark(): Promise<ExternalMarketBenchmark> {
    const payload = await backendApi.publicMarketExternalBenchmark();
    return toExternalMarketBenchmark(payload);
  },

  async getExternalNewsDigest(): Promise<ExternalNewsDigest> {
    const payload = await backendApi.publicMarketExternalNewsDigest();
    return toExternalNewsDigest(payload);
  },

  async getClimateForecast(region: PublicClimateRegion): Promise<PublicClimateForecast> {
    const payload = await backendApi.publicMarketClimateForecast(region);
    return toPublicClimateForecast(payload);
  },
};
