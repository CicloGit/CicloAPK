import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, onRequest, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type { Request, Response } from 'express';
import { AuditService } from './core/auditService.js';
import { MarketKernel } from './core/marketKernel.js';

initializeApp();

const db = getFirestore();
const adminAuth = getAuth();
const marketKernel = new MarketKernel(db);
const auditService = new AuditService(db);
const NODE_ENV = String(process.env.NODE_ENV ?? '').toLowerCase();
const ENFORCE_APP_CHECK = process.env.FUNCTIONS_ENFORCE_APP_CHECK
  ? process.env.FUNCTIONS_ENFORCE_APP_CHECK === 'true'
  : NODE_ENV === 'production';
const STOCK_ALLOWED_ROLES = new Set(['Produtor', 'Gestor', 'Fornecedor']);
const MODULE_CONTROL_ALLOWED_ROLES = new Set(['Gestor', 'Administrador', 'Integradora']);
const ROLE_CLAIM_MAP: Record<string, string> = {
  PRODUCER: 'PRODUCER',
  PRODUTOR: 'PRODUCER',
  SUPPLIER: 'SUPPLIER',
  FORNECEDOR: 'SUPPLIER',
  INTEGRATOR: 'INTEGRATOR',
  INTEGRADORA: 'INTEGRATOR',
  AUCTIONEER: 'AUCTIONEER',
  LEILOEIRO: 'AUCTIONEER',
  TECHNICIAN: 'TECHNICIAN',
  TECNICO: 'TECHNICIAN',
  INVESTOR: 'INVESTOR',
  INVESTIDOR: 'INVESTOR',
  MANAGER: 'MANAGER',
  GESTOR: 'MANAGER',
  TRAFFIC_MANAGER: 'TRAFFIC_MANAGER',
  GESTOR_DE_TRAFEGO: 'TRAFFIC_MANAGER',
  OPERATOR: 'OPERATOR',
  OPERADOR: 'OPERATOR',
  ADMIN: 'ADMIN',
  ADMINISTRADOR: 'ADMIN',
};
const PROFILE_ROLE_FROM_CLAIMS: Record<string, string> = {
  PRODUCER: 'Produtor',
  SUPPLIER: 'Fornecedor',
  INTEGRATOR: 'Integradora',
  AUCTIONEER: 'Leiloeiro',
  TECHNICIAN: 'Técnico',
  INVESTOR: 'Investidor',
  MANAGER: 'Gestor',
  TRAFFIC_MANAGER: 'Gestor de Trafego',
  OPERATOR: 'Operador',
  ADMIN: 'Administrador',
};
const MPV_CICLO_SMARTPOS_WEBHOOK_SECRET = defineSecret('MPV_CICLO_SMARTPOS_WEBHOOK_SECRET');
const MPV_CICLO_ASAAS_WEBHOOK_SECRET = defineSecret('MPV_CICLO_ASAAS_WEBHOOK_SECRET');
const MPV_CICLO_ERP_FORWARD_SECRET = defineSecret('MPV_CICLO_ERP_FORWARD_SECRET');

type AIAction = 'TREAT' | 'STUDY';
type CropSeason = 'VERAO' | 'OUTONO' | 'INVERNO' | 'PRIMAVERA';
type ProducerCultureStage =
  | 'SEMENTEIRA'
  | 'EMERGENCIA'
  | 'VEGETATIVO'
  | 'FLORACAO'
  | 'FRUTIFICACAO'
  | 'MATURACAO'
  | 'COLHEITA';
type ProducerPlantCondition = 'EXCELENTE' | 'BOA' | 'ATENCAO' | 'CRITICA';
type ProducerSoilType = 'ARENOSO' | 'ARGILOSO' | 'SILTOSO' | 'MISTO';

interface AIImageSignals {
  greenRatio?: number;
  yellowRatio?: number;
  brownRatio?: number;
  brightness?: number;
}

interface AIAnalyzeContext {
  cultureName?: string;
  soilType?: ProducerSoilType;
  region?: PublicClimateRegionKey;
  season?: CropSeason;
  rainfallMm?: number;
  fertilizationKgHa?: number;
  animalHandlingDays?: number;
  daysFromPlanting?: number;
  imageSignals?: AIImageSignals;
}

interface AIAnalyzePayload {
  imageName?: string;
  context?: AIAnalyzeContext;
}

interface AIAnalysisResult {
  diagnosis: string;
  confidence: number;
  recommendation: string;
  action: AIAction;
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
  region?: PublicClimateRegionKey;
}

interface CarRegistryPayload {
  protocol: string;
  municipality: string;
  totalArea: string;
  rl: string;
  app: string;
  status: string;
  owner: string;
}

interface AdminSetUserClaimsPayload {
  uid?: string;
  role?: string;
  tenantId?: string;
  producerScopes?: {
    seedProducer?: boolean;
  };
}

type PublicMarketPriceCategory = 'COMMODITY' | 'LIVESTOCK' | 'INPUT';
type PublicClimateRegionKey = 'NORTE' | 'NORDESTE' | 'CENTRO_OESTE' | 'SUDESTE' | 'SUL';

interface AdminUpsertPublicMarketPointPayload {
  symbol?: string;
  category?: PublicMarketPriceCategory;
  name?: string;
  unit?: string;
  currency?: string;
  price?: number;
  date?: string;
  source?: string;
  sourceRef?: string;
  region?: string;
}

interface InputBasketComponent {
  symbol: string;
  weight: number;
}

interface ExternalMarketBenchmarkItem {
  id: string;
  symbol: string;
  name: string;
  category: PublicMarketPriceCategory;
  unit: string;
  referenceKgPerUnit: number;
  currency: string;
  internalPrice: number | null;
  externalAveragePrice: number;
  spreadPct: number | null;
  externalSampleSize: number;
  updatedAt: string;
}

interface ExternalMarketBenchmarkPayload {
  updatedAt: string;
  internalDataAvailable: boolean;
  stale: boolean;
  items: ExternalMarketBenchmarkItem[];
}

interface ExternalNewsDigestItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: 'Mercado';
  sourceLabel: string;
  link: string;
}

interface ExternalNewsDigestPayload {
  updatedAt: string;
  stale: boolean;
  items: ExternalNewsDigestItem[];
}

interface ExternalPriceDescriptor {
  key: string;
  category: PublicMarketPriceCategory;
  label: string;
  defaultUnit: string;
  targetUnitKg: number;
  quoteUnitKg: number;
  quoteInCents: boolean;
  keywords: string[];
  yahooSymbol: string;
  stooqSymbol: string;
}

interface ExternalPriceSample {
  source: string;
  priceUsd: number;
  updatedAt: string;
}

interface PublicClimateForecastDay {
  date: string;
  tempMinC: number;
  tempMaxC: number;
  precipitationProbabilityPct: number;
  precipitationMm: number;
  windMaxKmh: number;
}

interface PublicClimateForecastPayload {
  region: PublicClimateRegionKey;
  regionLabel: string;
  referenceCity: string;
  updatedAt: string;
  stale: boolean;
  days: PublicClimateForecastDay[];
}

type SupportModuleKey = 'ERP_CORE' | 'MPV_CICLO' | 'CEREBRO_NEXUS';
type SupportModuleEnvironment = 'LOCAL' | 'HOMOLOGACAO' | 'PRODUCAO';
type SupportModuleAuthMode = 'NONE' | 'BEARER' | 'API_KEY';
type SupportModuleHealthStatus = 'ONLINE' | 'OFFLINE' | 'UNCONFIGURED' | 'DISABLED' | 'DEGRADED';
type SupportModuleCriticality = 'CORE' | 'HIGH' | 'MEDIUM';

interface SupportModuleHealthPayload {
  status: SupportModuleHealthStatus;
  checkedAt: string;
  message: string;
  targetUrl?: string;
  latencyMs?: number;
  httpStatus?: number;
}

interface SupportModuleRuntimePayload {
  moduleKey: SupportModuleKey;
  displayName: string;
  description: string;
  owningSystem: string;
  criticality: SupportModuleCriticality;
  baseUrl: string;
  healthPath: string;
  manifestPath: string;
  environment: SupportModuleEnvironment;
  authMode: SupportModuleAuthMode;
  credentialRef: string;
  enabled: boolean;
  capabilities: string[];
  lastConfiguredAt?: string;
  lastConfiguredBy?: string;
  lastHealthCheck?: SupportModuleHealthPayload | null;
}

type SupportModuleRuntimeSeed = {
  baseUrl: string;
  healthPath: string;
  manifestPath: string;
  environment: SupportModuleEnvironment;
  authMode: SupportModuleAuthMode;
  credentialRef: string;
  enabled: boolean;
  capabilities: string[];
};

interface SupportModuleUpsertPayload {
  moduleKey?: SupportModuleKey;
  baseUrl?: string;
  healthPath?: string;
  manifestPath?: string;
  environment?: SupportModuleEnvironment;
  authMode?: SupportModuleAuthMode;
  credentialRef?: string;
  enabled?: boolean;
  capabilities?: string[];
}

type SupportModuleManifestSource = 'DIRECT' | 'NEXUS' | 'CATALOG';

interface SupportModuleManifestPayload {
  moduleKey: SupportModuleKey;
  displayName: string;
  description: string;
  owningSystem: string;
  capabilities: string[];
  healthPath: string;
  manifestPath: string;
  source: SupportModuleManifestSource;
  status: SupportModuleHealthStatus;
  sourceUrl: string;
  message: string;
  checkedAt: string;
  runtimeHealthMessage?: string;
  runtimeTargetUrl?: string;
  manifest?: Record<string, unknown>;
}

type NexusSignalSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
type NexusSignalDomain = 'MARKET' | 'SUPPORT' | 'INTEGRATION' | 'GOVERNANCE';

interface NexusSignalPayload {
  id: string;
  tenantId: string;
  auditId: string;
  sequence: number;
  stream: string;
  eventType: string;
  operationType: string;
  auditStatus: string;
  actorUid: string;
  actorRole: string;
  eventCreatedAtIso: string;
  observedAtIso: string;
  severity: NexusSignalSeverity;
  domain: NexusSignalDomain;
  summary: string;
  recommendedAction: string;
  tags: string[];
  sourceSystem: 'ERP_CORE';
  payload: Record<string, unknown>;
  hash: string;
  prevHash: string;
}

interface NexusSignalSummaryPayload {
  tenantId: string;
  totalSignals: number;
  lastSignalAtIso?: string;
  lastSeverity?: NexusSignalSeverity;
  lastEventType?: string;
  lastSummary?: string;
  lastAuditSequence?: number;
  severityCounts?: Record<string, number>;
  domainCounts?: Record<string, number>;
  statusCounts?: Record<string, number>;
}

interface TenantAuditLogPayload {
  id: string;
  tenantId: string;
  stream: string;
  sequence: number;
  eventType: string;
  operationType: string;
  status: string;
  actorUid: string;
  actorRole: string;
  payload: Record<string, unknown>;
  hash: string;
  prevHash: string;
  createdAtIso: string;
}

const PUBLIC_PRICE_CATEGORIES = new Set<PublicMarketPriceCategory>(['COMMODITY', 'LIVESTOCK', 'INPUT']);
const PUBLIC_EXTERNAL_CACHE_COLLECTION = 'publicMarketExternalCache';
const EXTERNAL_BENCHMARK_CACHE_DOC = 'marketBenchmark';
const EXTERNAL_NEWS_CACHE_DOC = 'newsDigest';
const EXTERNAL_CACHE_TTL_MS = 1000 * 60 * 30;
const EXTERNAL_DEFAULT_USD_BRL = 5;
const EXTERNAL_MIN_SOURCES = 5;
const EXTERNAL_NEWS_GENERIC_LABEL = 'Fonte externa verificada';
const EXTERNAL_NEWS_ALLOWED_DOMAINS = ['gov.br', 'embrapa.br', 'fao.org', 'usda.gov'];
const EXTERNAL_PRICE_DESCRIPTORS: ExternalPriceDescriptor[] = [
  {
    key: 'SOJA',
    category: 'COMMODITY',
    label: 'Soja',
    defaultUnit: 'saca 60kg',
    targetUnitKg: 60,
    quoteUnitKg: 27.2155, // bushel de soja
    quoteInCents: true,
    keywords: ['soja', 'soy'],
    yahooSymbol: 'ZS=F',
    stooqSymbol: 'zs.c',
  },
  {
    key: 'MILHO',
    category: 'COMMODITY',
    label: 'Milho',
    defaultUnit: 'saca 60kg',
    targetUnitKg: 60,
    quoteUnitKg: 25.4012, // bushel de milho
    quoteInCents: true,
    keywords: ['milho', 'corn'],
    yahooSymbol: 'ZC=F',
    stooqSymbol: 'zc.c',
  },
  {
    key: 'TRIGO',
    category: 'COMMODITY',
    label: 'Trigo',
    defaultUnit: 'saca 60kg',
    targetUnitKg: 60,
    quoteUnitKg: 27.2155, // bushel de trigo
    quoteInCents: true,
    keywords: ['trigo', 'wheat'],
    yahooSymbol: 'ZW=F',
    stooqSymbol: 'zw.c',
  },
  {
    key: 'CAFE',
    category: 'COMMODITY',
    label: 'Cafe',
    defaultUnit: 'saca 60kg',
    targetUnitKg: 60,
    quoteUnitKg: 0.45359237, // libra
    quoteInCents: true,
    keywords: ['cafe', 'coffee'],
    yahooSymbol: 'KC=F',
    stooqSymbol: 'kc.c',
  },
  {
    key: 'ACUCAR',
    category: 'COMMODITY',
    label: 'Acucar',
    defaultUnit: 'saca 50kg',
    targetUnitKg: 50,
    quoteUnitKg: 0.45359237, // libra
    quoteInCents: true,
    keywords: ['acucar', 'sugar'],
    yahooSymbol: 'SB=F',
    stooqSymbol: 'sb.c',
  },
  {
    key: 'ALGODAO',
    category: 'COMMODITY',
    label: 'Algodao',
    defaultUnit: '@ 15kg',
    targetUnitKg: 15,
    quoteUnitKg: 0.45359237, // libra
    quoteInCents: true,
    keywords: ['algodao', 'cotton'],
    yahooSymbol: 'CT=F',
    stooqSymbol: 'ct.c',
  },
  {
    key: 'BOI',
    category: 'LIVESTOCK',
    label: 'Boi',
    defaultUnit: '@ 15kg',
    targetUnitKg: 15,
    quoteUnitKg: 0.45359237, // libra
    quoteInCents: true,
    keywords: ['boi', 'gado', 'cattle'],
    yahooSymbol: 'LE=F',
    stooqSymbol: 'le.c',
  },
  {
    key: 'SUINO',
    category: 'LIVESTOCK',
    label: 'Suino',
    defaultUnit: 'kg',
    targetUnitKg: 1,
    quoteUnitKg: 0.45359237, // libra
    quoteInCents: true,
    keywords: ['suino', 'hog', 'pork'],
    yahooSymbol: 'HE=F',
    stooqSymbol: 'he.c',
  },
];
const CLIMATE_CACHE_DOC_PREFIX = 'climateForecast';
const PUBLIC_CLIMATE_REGIONS: Record<
  PublicClimateRegionKey,
  { label: string; referenceCity: string; latitude: number; longitude: number }
> = {
  NORTE: {
    label: 'Norte',
    referenceCity: 'Manaus',
    latitude: -3.119,
    longitude: -60.0217,
  },
  NORDESTE: {
    label: 'Nordeste',
    referenceCity: 'Petrolina',
    latitude: -9.3891,
    longitude: -40.5031,
  },
  CENTRO_OESTE: {
    label: 'Centro-Oeste',
    referenceCity: 'Goiania',
    latitude: -16.6869,
    longitude: -49.2648,
  },
  SUDESTE: {
    label: 'Sudeste',
    referenceCity: 'Ribeirao Preto',
    latitude: -21.1775,
    longitude: -47.8103,
  },
  SUL: {
    label: 'Sul',
    referenceCity: 'Cascavel',
    latitude: -24.9578,
    longitude: -53.4591,
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const send = (res: Response, status: number, body: unknown) => {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
  res.status(status).json(body);
};

const todayBR = () => new Date().toLocaleDateString('pt-BR');

const normalizeLegacyPath = (path: string) => {
  if (path.startsWith('/api/')) {
    return path.slice(4);
  }
  if (path === '/api') {
    return '/';
  }
  return path;
};

const parseAuthToken = (authorization: string | undefined): string | null => {
  if (!authorization) {
    return null;
  }
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
};

const requireUser = async (req: Request): Promise<string> => {
  const token = parseAuthToken(req.headers.authorization);
  if (!token) {
    throw new Error('UNAUTHORIZED');
  }
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
};

const requireUserProfile = async (uid: string): Promise<{ role: string; tenantId: string }> => {
  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('failed-precondition', 'Perfil do usuario nao encontrado.');
  }

  const role = String(userDoc.get('role') ?? '');
  const tenantId = String(userDoc.get('tenantId') ?? '');
  if (!role || !tenantId) {
    throw new HttpsError('failed-precondition', 'Dados de perfil incompletos.');
  }

  return { role, tenantId };
};

const requireRole = async (uid: string): Promise<{ role: string; tenantId: string }> => {
  const profile = await requireUserProfile(uid);
  if (!STOCK_ALLOWED_ROLES.has(profile.role)) {
    throw new HttpsError('permission-denied', 'Sem permissao.');
  }
  return profile;
};

const normalizeRoleClaimInput = (role: unknown): string => {
  const normalized = String(role ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  return ROLE_CLAIM_MAP[normalized] ?? '';
};

const normalizeProducerScopesClaim = (value: unknown): { seedProducer?: boolean } => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const raw = value as Record<string, unknown>;
  return {
    seedProducer: raw.seedProducer === true,
  };
};

const callerHasAdminClaim = (token: Record<string, unknown> | undefined): boolean =>
  normalizeRoleClaimInput(token?.role) === 'ADMIN';

const asIsoString = (value: unknown): string | null => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const dateValue = (value as { toDate: () => Date }).toDate();
    return dateValue.toISOString();
  }
  return null;
};

const normalizePublicCategory = (value: unknown): PublicMarketPriceCategory => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!PUBLIC_PRICE_CATEGORIES.has(normalized as PublicMarketPriceCategory)) {
    throw new HttpsError('invalid-argument', 'Categoria de preco publico invalida.');
  }
  return normalized as PublicMarketPriceCategory;
};

const normalizeDateKey = (value: unknown): string => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  const parsed = new Date(String(value ?? ''));
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
};

const numeric = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const computeChangePct = (price: number, previous: number | null): number => {
  if (!previous || previous <= 0) {
    return 0;
  }
  return Number((((price - previous) / previous) * 100).toFixed(4));
};

const findClosestHistoricalPrice = async (symbol: string, targetDateKey: string): Promise<number | null> => {
  const pointsSnapshot = await db
    .collection('publicMarketPrices')
    .doc(symbol)
    .collection('points')
    .orderBy('date', 'desc')
    .limit(120)
    .get();

  const pointDoc = pointsSnapshot.docs.find((docSnapshot) => String(docSnapshot.get('date') ?? '') <= targetDateKey);
  if (!pointDoc) {
    return null;
  }

  const price = Number(pointDoc.get('price'));
  return Number.isFinite(price) ? price : null;
};

const computePriceChanges = async (symbol: string, currentPrice: number, dateKey: string) => {
  const baseDate = new Date(`${dateKey}T00:00:00.000Z`);
  const day1 = new Date(baseDate);
  const day7 = new Date(baseDate);
  const day30 = new Date(baseDate);
  day1.setUTCDate(day1.getUTCDate() - 1);
  day7.setUTCDate(day7.getUTCDate() - 7);
  day30.setUTCDate(day30.getUTCDate() - 30);

  const [price1d, price7d, price30d] = await Promise.all([
    findClosestHistoricalPrice(symbol, day1.toISOString().slice(0, 10)),
    findClosestHistoricalPrice(symbol, day7.toISOString().slice(0, 10)),
    findClosestHistoricalPrice(symbol, day30.toISOString().slice(0, 10)),
  ]);

  return {
    change1d: computeChangePct(currentPrice, price1d),
    change7d: computeChangePct(currentPrice, price7d),
    change30d: computeChangePct(currentPrice, price30d),
  };
};

const parseInputBasket = (value: unknown): InputBasketComponent[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const components = value
    .map((entry) => ({
      symbol: String((entry as { symbol?: unknown })?.symbol ?? '').trim().toUpperCase(),
      weight: Number((entry as { weight?: unknown })?.weight ?? 0),
    }))
    .filter((entry) => entry.symbol.length > 0 && Number.isFinite(entry.weight) && entry.weight > 0);

  if (components.length === 0) {
    return [];
  }

  const totalWeight = components.reduce((sum, item) => sum + item.weight, 0);
  return components.map((item) => ({
    symbol: item.symbol,
    weight: item.weight / totalWeight,
  }));
};

const loadInputBasket = async (): Promise<{ components: InputBasketComponent[]; minComponentsRequired: number }> => {
  const basketDoc = await db.collection('publicMarketConfig').doc('inputBasket').get();
  if (basketDoc.exists) {
    const raw = basketDoc.data() as Record<string, unknown>;
    const components = parseInputBasket(raw.components);
    const minComponentsRequired = Math.max(1, Math.floor(numeric(raw.minComponentsRequired, 1)));

    if (components.length > 0) {
      return { components, minComponentsRequired };
    }
  }

  const fallbackSnapshot = await db.collection('publicMarketPrices').where('category', '==', 'INPUT').limit(20).get();
  const fallbackComponents = fallbackSnapshot.docs
    .map((docSnapshot) => String(docSnapshot.id ?? '').trim().toUpperCase())
    .filter((symbol) => symbol.length > 0)
    .slice(0, 10);

  if (fallbackComponents.length === 0) {
    return { components: [], minComponentsRequired: 1 };
  }

  const weight = 1 / fallbackComponents.length;
  return {
    components: fallbackComponents.map((symbol) => ({ symbol, weight })),
    minComponentsRequired: 1,
  };
};

const recomputeInputCostIndex = async () => {
  const nowIso = new Date().toISOString();
  const { components, minComponentsRequired } = await loadInputBasket();
  const componentsUsed: Array<{ symbol: string; weight: number; change7d: number; change30d: number }> = [];
  const staleComponents: string[] = [];

  let weighted7 = 0;
  let weighted30 = 0;
  let appliedWeight = 0;

  for (const component of components) {
    const priceDoc = await db.collection('publicMarketPrices').doc(component.symbol).get();
    if (!priceDoc.exists) {
      staleComponents.push(component.symbol);
      continue;
    }

    const raw = priceDoc.data() as Record<string, unknown>;
    if (String(raw.category ?? '') !== 'INPUT') {
      staleComponents.push(component.symbol);
      continue;
    }
    if (!isRealSource(raw.source ? String(raw.source) : '')) {
      staleComponents.push(component.symbol);
      continue;
    }

    const change7d = numeric(raw.change7d, 0);
    const change30d = numeric(raw.change30d, 0);

    componentsUsed.push({
      symbol: component.symbol,
      weight: Number(component.weight.toFixed(6)),
      change7d,
      change30d,
    });

    weighted7 += component.weight * change7d;
    weighted30 += component.weight * change30d;
    appliedWeight += component.weight;
  }

  const validComponentCount = componentsUsed.length;
  const normalized7 = appliedWeight > 0 ? weighted7 / appliedWeight : 0;
  const normalized30 = appliedWeight > 0 ? weighted30 / appliedWeight : 0;

  const payload = {
    window7d: validComponentCount >= minComponentsRequired ? Number(normalized7.toFixed(4)) : 0,
    window30d: validComponentCount >= minComponentsRequired ? Number(normalized30.toFixed(4)) : 0,
    componentsUsed,
    staleComponents,
    minComponentsRequired,
    updatedAt: FieldValue.serverTimestamp(),
    updatedAtIso: nowIso,
  };

  await db.collection('publicMarketIndices').doc('inputCostIndex').set(payload, { merge: true });

  return {
    window7d: payload.window7d,
    window30d: payload.window30d,
    componentsUsed: payload.componentsUsed,
    staleComponents: payload.staleComponents,
    updatedAt: payload.updatedAtIso,
  };
};

const mapPriceDoc = (docSnapshot: any) => {
  const raw = docSnapshot.data() as Record<string, unknown>;
  return {
    symbol: String(raw.symbol ?? docSnapshot.id),
    category: String(raw.category ?? 'COMMODITY'),
    name: String(raw.name ?? raw.symbol ?? docSnapshot.id),
    unit: String(raw.unit ?? ''),
    currency: String(raw.currency ?? 'BRL'),
    price: numeric(raw.price, 0),
    change1d: numeric(raw.change1d, 0),
    change7d: numeric(raw.change7d, 0),
    change30d: numeric(raw.change30d, 0),
    source: raw.source ? String(raw.source) : undefined,
    sourceRef: raw.sourceRef ? String(raw.sourceRef) : undefined,
    region: raw.region ? String(raw.region) : undefined,
    updatedAt: asIsoString(raw.updatedAt) ?? asIsoString(raw.updatedAtIso),
  };
};

const mapInputIndexDoc = (raw: Record<string, unknown> | undefined | null) => {
  if (!raw) {
    return null;
  }

  const componentsUsed = Array.isArray(raw.componentsUsed)
    ? raw.componentsUsed.map((entry) => ({
        symbol: String((entry as { symbol?: unknown })?.symbol ?? ''),
        weight: numeric((entry as { weight?: unknown })?.weight, 0),
        change7d: numeric((entry as { change7d?: unknown })?.change7d, 0),
        change30d: numeric((entry as { change30d?: unknown })?.change30d, 0),
      }))
    : [];

  return {
    window7d: numeric(raw.window7d, 0),
    window30d: numeric(raw.window30d, 0),
    componentsUsed,
    staleComponents: Array.isArray(raw.staleComponents) ? raw.staleComponents.map((entry) => String(entry)) : [],
    updatedAt: asIsoString(raw.updatedAt) ?? asIsoString(raw.updatedAtIso),
  };
};

const rankByVolatility = (items: ReturnType<typeof mapPriceDoc>[], category: PublicMarketPriceCategory) =>
  items
    .filter((item) => item.category === category)
    .sort((a, b) => Math.abs(b.change1d) - Math.abs(a.change1d))
    .slice(0, 5);

const normalizeForMatch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeCurrencyCode = (value: string): string => {
  const currency = String(value ?? '')
    .trim()
    .toUpperCase();
  return currency || 'BRL';
};

const toUsdValue = (rawQuote: number, quoteInCents: boolean): number => (quoteInCents ? rawQuote / 100 : rawQuote);

const normalizeUnitToKg = (unit: string): number | null => {
  const normalized = normalizeForMatch(unit);
  if (!normalized) {
    return null;
  }

  if (normalized === 'kg' || normalized === 'quilo' || normalized === 'quilograma' || normalized === 'quilogramas') {
    return 1;
  }

  if (normalized.includes('@') || normalized.includes('arroba')) {
    return 15;
  }

  if (normalized.includes('ton')) {
    return 1000;
  }

  if (normalized.includes('saca')) {
    const match = normalized.match(/(\d+(\.\d+)?)/);
    if (match) {
      return Number(match[1]);
    }
    return 60;
  }

  const explicitKg = normalized.match(/(\d+(\.\d+)?)\s*kg/);
  if (explicitKg) {
    return Number(explicitKg[1]);
  }

  return null;
};

const convertInternalPriceToTargetUnit = (price: number, sourceUnit: string, targetUnitKg: number): number | null => {
  const sourceUnitKg = normalizeUnitToKg(sourceUnit);
  if (!sourceUnitKg || sourceUnitKg <= 0 || !Number.isFinite(price) || price <= 0) {
    return null;
  }
  const value = (price / sourceUnitKg) * targetUnitKg;
  return Number.isFinite(value) && value > 0 ? value : null;
};

const convertExternalQuoteToTargetCurrency = (params: {
  rawQuote: number;
  descriptor: ExternalPriceDescriptor;
  targetCurrency: string;
  usdBrl: number;
}): number => {
  const usdPerQuoteUnit = toUsdValue(params.rawQuote, params.descriptor.quoteInCents);
  if (!Number.isFinite(usdPerQuoteUnit) || usdPerQuoteUnit <= 0) {
    return 0;
  }

  const usdPerKg = usdPerQuoteUnit / params.descriptor.quoteUnitKg;
  if (!Number.isFinite(usdPerKg) || usdPerKg <= 0) {
    return 0;
  }

  const usdPerTargetUnit = usdPerKg * params.descriptor.targetUnitKg;
  const currency = normalizeCurrencyCode(params.targetCurrency);
  if (currency === 'USD') {
    return usdPerTargetUnit;
  }
  if (currency === 'BRL') {
    return usdPerTargetUnit * params.usdBrl;
  }
  return usdPerTargetUnit;
};

const isRealSource = (source?: string): boolean => {
  const normalized = normalizeForMatch(String(source ?? ''));
  if (!normalized) {
    return true;
  }
  return !normalized.includes('mock') && !normalized.includes('simulado') && !normalized.includes('ficticio');
};

const standardizePriceItemForPublic = (item: ReturnType<typeof mapPriceDoc>): ReturnType<typeof mapPriceDoc> => {
  if (!isRealSource(item.source)) {
    return item;
  }

  const descriptor = resolveDescriptorForInternalItem(item);
  if (!descriptor) {
    return item;
  }

  const normalizedPrice = convertInternalPriceToTargetUnit(item.price, item.unit || descriptor.defaultUnit, descriptor.targetUnitKg);
  return {
    ...item,
    unit: descriptor.defaultUnit,
    price: normalizedPrice !== null ? Number(normalizedPrice.toFixed(4)) : item.price,
  };
};

const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
};

const isNotNull = <T>(value: T | null): value is T => value !== null;

const safeFetchText = async (url: string, timeoutMs = 8000): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json, text/plain, text/xml, application/rss+xml, */*',
        'user-agent': 'CicloPlusPublicMarket/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
};

const safeFetchJson = async <T>(url: string, timeoutMs = 8000): Promise<T | null> => {
  const payload = await safeFetchText(url, timeoutMs);
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));

const stripHtml = (value: string): string =>
  decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractRssTag = (section: string, tag: string): string => {
  const match = section.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripHtml(match[1]) : '';
};

const toIsoDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const extractHostname = (url: string): string => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const isAllowedNewsDomain = (hostname: string): boolean =>
  EXTERNAL_NEWS_ALLOWED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));

const buildNewsId = (title: string, dateIso: string): string =>
  createHash('sha256')
    .update(`${title}|${dateIso}`)
    .digest('hex')
    .slice(0, 24);

const parseRssNewsItems = (xml: string): ExternalNewsDigestItem[] => {
  const itemSections = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  return itemSections
    .map((section) => {
      const title = extractRssTag(section, 'title');
      const description = extractRssTag(section, 'description');
      const link = extractRssTag(section, 'link');
      const pubDate = extractRssTag(section, 'pubDate');
      const sourceUrlMatch = section.match(/<source[^>]*url=["']([^"']+)["'][^>]*>/i);
      const sourceUrl = sourceUrlMatch ? sourceUrlMatch[1] : link;
      const host = extractHostname(sourceUrl || link);

      if (!title || !link || !isAllowedNewsDomain(host)) {
        return null;
      }

      const dateIso = toIsoDate(pubDate || new Date().toISOString());
      return {
        id: buildNewsId(title, dateIso),
        title,
        summary: description || 'Atualizacao de mercado em fonte externa verificada.',
        date: dateIso,
        category: 'Mercado' as const,
        sourceLabel: EXTERNAL_NEWS_GENERIC_LABEL,
        link,
      };
    })
    .filter((item): item is ExternalNewsDigestItem => item !== null);
};

const fetchUsdBrlRate = async (): Promise<number> => {
  const payload = await safeFetchJson<{ USDBRL?: { bid?: string | number } }>(
    'https://economia.awesomeapi.com.br/json/last/USD-BRL',
    5000
  );
  const bid = numeric(payload?.USDBRL?.bid, Number.NaN);
  if (!Number.isFinite(bid) || bid <= 0) {
    return EXTERNAL_DEFAULT_USD_BRL;
  }
  return bid;
};

const fetchYahooPriceSample = async (symbol: string): Promise<ExternalPriceSample | null> => {
  const payload = await safeFetchJson<{
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number; currency?: string };
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        timestamp?: number[];
      }>;
    };
  }>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`);

  const result = payload?.chart?.result?.[0];
  if (!result) {
    return null;
  }

  let price = numeric(result.meta?.regularMarketPrice, Number.NaN);
  if (!Number.isFinite(price) || price <= 0) {
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const latestClose = [...closes].reverse().find((value) => Number.isFinite(value as number) && (value as number) > 0);
    price = numeric(latestClose, Number.NaN);
  }

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const timestampSeconds = Array.isArray(result.timestamp) && result.timestamp.length > 0 ? result.timestamp[result.timestamp.length - 1] : null;
  const updatedAt =
    Number.isFinite(timestampSeconds as number) && Number(timestampSeconds) > 0
      ? new Date(Number(timestampSeconds) * 1000).toISOString()
      : new Date().toISOString();

  return { source: 'YAHOO_QUERY1_CHART', priceUsd: price, updatedAt };
};

const fetchYahooPriceSampleSecondary = async (symbol: string): Promise<ExternalPriceSample | null> => {
  const payload = await safeFetchJson<{
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number };
        indicators?: { quote?: Array<{ close?: Array<number | null> }> };
        timestamp?: number[];
      }>;
    };
  }>(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`);

  const result = payload?.chart?.result?.[0];
  if (!result) {
    return null;
  }

  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const latestClose = [...closes].reverse().find((value) => Number.isFinite(value as number) && (value as number) > 0);
  const price = numeric(latestClose ?? result.meta?.regularMarketPrice, Number.NaN);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const timestampSeconds =
    Array.isArray(result.timestamp) && result.timestamp.length > 0 ? result.timestamp[result.timestamp.length - 1] : null;
  const updatedAt =
    Number.isFinite(timestampSeconds as number) && Number(timestampSeconds) > 0
      ? new Date(Number(timestampSeconds) * 1000).toISOString()
      : new Date().toISOString();

  return { source: 'YAHOO_QUERY2_CHART', priceUsd: price, updatedAt };
};

const fetchYahooSparkPriceSample = async (symbol: string): Promise<ExternalPriceSample | null> => {
  const payload = await safeFetchJson<{
    spark?: Record<
      string,
      {
        timestamp?: number[];
        close?: number[];
      }
    >;
  }>(`https://query1.finance.yahoo.com/v7/finance/spark?symbols=${encodeURIComponent(symbol)}&interval=1d&range=5d`);

  const sparkKey = Object.keys(payload?.spark ?? {})[0];
  const spark = sparkKey ? payload?.spark?.[sparkKey] : null;
  if (!spark) {
    return null;
  }

  const closes = Array.isArray(spark.close) ? spark.close : [];
  const timestamps = Array.isArray(spark.timestamp) ? spark.timestamp : [];
  const latestClose = [...closes].reverse().find((value) => Number.isFinite(value) && value > 0);
  if (!Number.isFinite(latestClose as number) || Number(latestClose) <= 0) {
    return null;
  }

  const lastTs = timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined;
  const updatedAt = Number.isFinite(lastTs as number) ? new Date(Number(lastTs) * 1000).toISOString() : new Date().toISOString();

  return {
    source: 'YAHOO_SPARK',
    priceUsd: Number(latestClose),
    updatedAt,
  };
};

const fetchYahooQuotePriceSample = async (symbol: string): Promise<ExternalPriceSample | null> => {
  const payload = await safeFetchJson<{
    quoteResponse?: {
      result?: Array<{
        regularMarketPrice?: number;
        regularMarketTime?: number;
      }>;
    };
  }>(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`);

  const quote = payload?.quoteResponse?.result?.[0];
  const price = numeric(quote?.regularMarketPrice, Number.NaN);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const updatedAt =
    Number.isFinite(quote?.regularMarketTime as number) && Number(quote?.regularMarketTime) > 0
      ? new Date(Number(quote?.regularMarketTime) * 1000).toISOString()
      : new Date().toISOString();

  return { source: 'YAHOO_QUOTE', priceUsd: price, updatedAt };
};

const fetchStooqPriceSample = async (symbol: string): Promise<ExternalPriceSample | null> => {
  const csv = await safeFetchText(
    `https://stooq.com/q/l/?s=${encodeURIComponent(symbol.toLowerCase())}&f=sd2t2ohlcv&h&e=csv`,
    6000
  );

  if (!csv) {
    return null;
  }

  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return null;
  }

  const headers = lines[0].split(',').map((value) => value.trim().toLowerCase());
  const values = lines[1].split(',').map((value) => value.trim());
  const closeIndex = headers.indexOf('close');
  if (closeIndex < 0 || closeIndex >= values.length) {
    return null;
  }

  const price = numeric(values[closeIndex], Number.NaN);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const dateIndex = headers.indexOf('date');
  const timeIndex = headers.indexOf('time');
  const rawDate = dateIndex >= 0 && dateIndex < values.length ? values[dateIndex] : '';
  const rawTime = timeIndex >= 0 && timeIndex < values.length ? values[timeIndex] : '';
  const updatedAt = rawDate
    ? new Date(`${rawDate}${rawTime ? `T${rawTime}` : 'T00:00:00'}Z`).toISOString()
    : new Date().toISOString();

  return { source: 'STOOQ_QUOTE', priceUsd: price, updatedAt };
};

const fetchStooqDailyPriceSample = async (symbol: string): Promise<ExternalPriceSample | null> => {
  const csv = await safeFetchText(`https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol.toLowerCase())}&i=d`, 7000);
  if (!csv) {
    return null;
  }

  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return null;
  }

  const headers = lines[0].split(',').map((value) => value.trim().toLowerCase());
  const closeIndex = headers.indexOf('close');
  const dateIndex = headers.indexOf('date');
  if (closeIndex < 0 || dateIndex < 0) {
    return null;
  }

  const lastValues = lines[lines.length - 1].split(',').map((value) => value.trim());
  if (lastValues.length <= Math.max(closeIndex, dateIndex)) {
    return null;
  }

  const price = numeric(lastValues[closeIndex], Number.NaN);
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  const rawDate = lastValues[dateIndex];
  const updatedAt = rawDate ? new Date(`${rawDate}T00:00:00Z`).toISOString() : new Date().toISOString();

  return {
    source: 'STOOQ_DAILY',
    priceUsd: price,
    updatedAt,
  };
};

const collectExternalPriceSamples = async (descriptor: ExternalPriceDescriptor): Promise<ExternalPriceSample[]> => {
  const [yahoo, yahoo2, yahooSpark, yahooQuote, stooq, stooqDaily] = await Promise.all([
    fetchYahooPriceSample(descriptor.yahooSymbol),
    fetchYahooPriceSampleSecondary(descriptor.yahooSymbol),
    fetchYahooSparkPriceSample(descriptor.yahooSymbol),
    fetchYahooQuotePriceSample(descriptor.yahooSymbol),
    fetchStooqPriceSample(descriptor.stooqSymbol),
    fetchStooqDailyPriceSample(descriptor.stooqSymbol),
  ]);

  const uniqueBySource = new Map<string, ExternalPriceSample>();
  [yahoo, yahoo2, yahooSpark, yahooQuote, stooq, stooqDaily]
    .filter((sample): sample is ExternalPriceSample => sample !== null)
    .forEach((sample) => {
      if (!uniqueBySource.has(sample.source)) {
        uniqueBySource.set(sample.source, sample);
      }
    });

  return Array.from(uniqueBySource.values());
};

const resolveDescriptorForInternalItem = (item: ReturnType<typeof mapPriceDoc>): ExternalPriceDescriptor | null => {
  const category = String(item.category ?? '').toUpperCase();
  const target = normalizeForMatch(`${item.symbol} ${item.name}`);
  const symbol = String(item.symbol ?? '').trim().toUpperCase();

  return (
    EXTERNAL_PRICE_DESCRIPTORS.find((descriptor) => {
      if (descriptor.category !== category) {
        return false;
      }
      if (descriptor.key === symbol) {
        return true;
      }
      return descriptor.keywords.some((keyword) => target.includes(normalizeForMatch(keyword)));
    }) ?? null
  );
};

const readExternalCache = async <T>(docId: string): Promise<{ payload: T | null; updatedAtIso: string | null; fresh: boolean }> => {
  const docSnapshot = await db.collection(PUBLIC_EXTERNAL_CACHE_COLLECTION).doc(docId).get();
  if (!docSnapshot.exists) {
    return { payload: null, updatedAtIso: null, fresh: false };
  }

  const raw = docSnapshot.data() as Record<string, unknown>;
  const payload = (raw.payload as T | undefined) ?? null;
  const updatedAtIso = asIsoString(raw.updatedAt) ?? asIsoString(raw.updatedAtIso);
  if (!payload || !updatedAtIso) {
    return { payload: null, updatedAtIso: null, fresh: false };
  }

  const ageMs = Date.now() - new Date(updatedAtIso).getTime();
  return {
    payload,
    updatedAtIso,
    fresh: Number.isFinite(ageMs) && ageMs <= EXTERNAL_CACHE_TTL_MS,
  };
};

const writeExternalCache = async <T>(docId: string, payload: T): Promise<void> => {
  await db.collection(PUBLIC_EXTERNAL_CACHE_COLLECTION).doc(docId).set(
    {
      payload,
      updatedAt: FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
    },
    { merge: true }
  );
};

const buildExternalMarketBenchmarkPayload = async (): Promise<ExternalMarketBenchmarkPayload> => {
  const nowIso = new Date().toISOString();
  const [pricesSnapshot, usdBrl] = await Promise.all([db.collection('publicMarketPrices').get(), fetchUsdBrlRate()]);
  const internalItems = pricesSnapshot.docs
    .map(mapPriceDoc)
    .map(standardizePriceItemForPublic)
    .filter((item) => isRealSource(item.source) && Number.isFinite(item.price) && item.price > 0);

  const mappedInternal = internalItems
    .map((item) => ({ item, descriptor: resolveDescriptorForInternalItem(item) }))
    .filter((entry): entry is { item: ReturnType<typeof mapPriceDoc>; descriptor: ExternalPriceDescriptor } => entry.descriptor !== null);

  const targets = mappedInternal.length > 0 ? mappedInternal.map((entry) => entry.descriptor) : EXTERNAL_PRICE_DESCRIPTORS;
  const uniqueDescriptors = Array.from(new Map(targets.map((descriptor) => [descriptor.key, descriptor])).values());

  const externalSampleMap = new Map<string, ExternalPriceSample[]>();
  await Promise.all(
    uniqueDescriptors.map(async (descriptor) => {
      const samples = await collectExternalPriceSamples(descriptor);
      externalSampleMap.set(descriptor.key, samples);
    })
  );

  let items: ExternalMarketBenchmarkItem[] = [];

  if (mappedInternal.length > 0) {
    items = mappedInternal
      .map((entry, index) => {
        const samples = externalSampleMap.get(entry.descriptor.key) ?? [];
        if (samples.length === 0) {
          return null;
        }

        const internalPrice = convertInternalPriceToTargetUnit(
          entry.item.price,
          entry.item.unit || entry.descriptor.defaultUnit,
          entry.descriptor.targetUnitKg
        );
        const externalAverage = average(
          samples
            .map((sample) =>
              convertExternalQuoteToTargetCurrency({
                rawQuote: sample.priceUsd,
                descriptor: entry.descriptor,
                targetCurrency: entry.item.currency,
                usdBrl,
              })
            )
            .filter((value) => value > 0)
        );
        if (!Number.isFinite(externalAverage) || externalAverage <= 0) {
          return null;
        }

        const spreadPct = internalPrice !== null && externalAverage > 0
          ? Number((((internalPrice - externalAverage) / externalAverage) * 100).toFixed(2))
          : null;
        const updatedAt = samples
          .map((sample) => sample.updatedAt)
          .sort((a, b) => b.localeCompare(a))[0] ?? nowIso;

        return {
          id: `${entry.item.symbol}-${index + 1}`,
          symbol: entry.item.symbol,
          name: entry.item.name,
          category: entry.item.category as PublicMarketPriceCategory,
          unit: entry.descriptor.defaultUnit,
          referenceKgPerUnit: entry.descriptor.targetUnitKg,
          currency: normalizeCurrencyCode(entry.item.currency),
          internalPrice: internalPrice !== null ? Number(internalPrice.toFixed(4)) : null,
          externalAveragePrice: Number(externalAverage.toFixed(4)),
          spreadPct,
          externalSampleSize: samples.length,
          updatedAt,
        };
      })
      .filter(isNotNull);
  } else {
    items = uniqueDescriptors
      .map((descriptor, index) => {
        const samples = externalSampleMap.get(descriptor.key) ?? [];
        if (samples.length === 0) {
          return null;
        }
        const externalAverage = average(
          samples
            .map((sample) =>
              convertExternalQuoteToTargetCurrency({
                rawQuote: sample.priceUsd,
                descriptor,
                targetCurrency: 'BRL',
                usdBrl,
              })
            )
            .filter((value) => value > 0)
        );
        if (!Number.isFinite(externalAverage) || externalAverage <= 0) {
          return null;
        }
        const updatedAt = samples
          .map((sample) => sample.updatedAt)
          .sort((a, b) => b.localeCompare(a))[0] ?? nowIso;

        return {
          id: `${descriptor.key}-${index + 1}`,
          symbol: descriptor.key,
          name: descriptor.label,
          category: descriptor.category,
          unit: descriptor.defaultUnit,
          referenceKgPerUnit: descriptor.targetUnitKg,
          currency: 'BRL',
          internalPrice: null,
          externalAveragePrice: Number(externalAverage.toFixed(4)),
          spreadPct: null,
          externalSampleSize: samples.length,
          updatedAt,
        };
      })
      .filter(isNotNull);
  }

  items = items
    .sort((a, b) => {
      if (a.internalPrice !== null && b.internalPrice === null) return -1;
      if (a.internalPrice === null && b.internalPrice !== null) return 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 24);

  return {
    updatedAt: nowIso,
    internalDataAvailable: mappedInternal.length > 0,
    stale: false,
    items,
  };
};

const buildExternalNewsDigestPayload = async (): Promise<ExternalNewsDigestPayload> => {
  const nowIso = new Date().toISOString();
  const feeds = [
    'https://www.nass.usda.gov/rss/news.xml',
    'https://news.google.com/rss/search?q=agronegocio+site:gov.br+OR+site:embrapa.br&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    'https://news.google.com/rss/search?q=mercado+agricola+site:fao.org+OR+site:usda.gov&hl=pt-BR&gl=BR&ceid=BR:pt-419',
  ];

  const feedResults = await Promise.all(feeds.map((feedUrl) => safeFetchText(feedUrl, 7000)));
  const mergedItems = feedResults
    .filter((payload): payload is string => Boolean(payload && payload.includes('<item')))
    .flatMap((payload) => parseRssNewsItems(payload));

  const deduped = Array.from(
    mergedItems.reduce((acc, item) => {
      const key = normalizeForMatch(item.title);
      if (!acc.has(key)) {
        acc.set(key, item);
      }
      return acc;
    }, new Map<string, ExternalNewsDigestItem>()).values()
  )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return {
    updatedAt: nowIso,
    stale: false,
    items: deduped,
  };
};

const normalizeClimateRegion = (value: unknown): PublicClimateRegionKey => {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'NORTE' || normalized === 'NORDESTE' || normalized === 'CENTRO_OESTE' || normalized === 'SUDESTE' || normalized === 'SUL') {
    return normalized as PublicClimateRegionKey;
  }
  return 'SUDESTE';
};

const climateCacheDocId = (region: PublicClimateRegionKey): string => `${CLIMATE_CACHE_DOC_PREFIX}_${region}`;

const buildPublicClimateForecastPayload = async (region: PublicClimateRegionKey): Promise<PublicClimateForecastPayload> => {
  const regionInfo = PUBLIC_CLIMATE_REGIONS[region] ?? PUBLIC_CLIMATE_REGIONS.SUDESTE;
  const nowIso = new Date().toISOString();

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${regionInfo.latitude}&longitude=${regionInfo.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&forecast_days=7&timezone=America%2FSao_Paulo`;
  const payload = await safeFetchJson<{
    daily?: {
      time?: string[];
      temperature_2m_max?: number[];
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
      precipitation_sum?: number[];
      wind_speed_10m_max?: number[];
    };
  }>(url, 8000);

  const dates = payload?.daily?.time ?? [];
  const maxTemp = payload?.daily?.temperature_2m_max ?? [];
  const minTemp = payload?.daily?.temperature_2m_min ?? [];
  const precipProb = payload?.daily?.precipitation_probability_max ?? [];
  const precipSum = payload?.daily?.precipitation_sum ?? [];
  const windMax = payload?.daily?.wind_speed_10m_max ?? [];

  const days: PublicClimateForecastDay[] = dates.map((date, index) => ({
    date,
    tempMinC: numeric(minTemp[index], 0),
    tempMaxC: numeric(maxTemp[index], 0),
    precipitationProbabilityPct: numeric(precipProb[index], 0),
    precipitationMm: numeric(precipSum[index], 0),
    windMaxKmh: numeric(windMax[index], 0),
  }));

  return {
    region,
    regionLabel: regionInfo.label,
    referenceCity: regionInfo.referenceCity,
    updatedAt: nowIso,
    stale: false,
    days,
  };
};

async function handlePublicMarket(req: Request, res: Response, routePath: string) {
  if (req.method !== 'GET') {
    send(res, 405, { error: 'Metodo nao permitido.' });
    return;
  }

  if (routePath === '/v1/public/market/prices') {
    const categoryRaw = req.query.category;
    const category = typeof categoryRaw === 'string' && categoryRaw.trim().length > 0 ? normalizePublicCategory(categoryRaw) : null;

    let query = db.collection('publicMarketPrices') as FirebaseFirestore.Query;
    if (category) {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const items = snapshot.docs
      .map(mapPriceDoc)
      .map(standardizePriceItemForPublic)
      .filter((item) => isRealSource(item.source) && Number.isFinite(item.price) && item.price > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
    send(res, 200, { data: { category: category ?? undefined, updatedAt: new Date().toISOString(), items } });
    return;
  }

  if (routePath === '/v1/public/market/index/input-cost') {
    const indexDoc = await db.collection('publicMarketIndices').doc('inputCostIndex').get();
    const payload = mapInputIndexDoc(indexDoc.exists ? (indexDoc.data() as Record<string, unknown>) : null) ?? {
      window7d: 0,
      window30d: 0,
      componentsUsed: [],
      staleComponents: [],
      updatedAt: null,
    };

    send(res, 200, { data: payload });
    return;
  }

  if (routePath === '/v1/public/market/summary') {
    const [pricesSnapshot, inputIndexDoc] = await Promise.all([
      db.collection('publicMarketPrices').get(),
      db.collection('publicMarketIndices').doc('inputCostIndex').get(),
    ]);
    const prices = pricesSnapshot.docs
      .map(mapPriceDoc)
      .map(standardizePriceItemForPublic)
      .filter((item) => isRealSource(item.source) && Number.isFinite(item.price) && item.price > 0);

    const summary = {
      updatedAt: new Date().toISOString(),
      countsByCategory: {
        COMMODITY: prices.filter((item) => item.category === 'COMMODITY').length,
        LIVESTOCK: prices.filter((item) => item.category === 'LIVESTOCK').length,
        INPUT: prices.filter((item) => item.category === 'INPUT').length,
      },
      topCommodities: rankByVolatility(prices, 'COMMODITY'),
      topLivestock: rankByVolatility(prices, 'LIVESTOCK'),
      topInputs: rankByVolatility(prices, 'INPUT'),
      inputCostIndex: mapInputIndexDoc(inputIndexDoc.exists ? (inputIndexDoc.data() as Record<string, unknown>) : null),
    };

    send(res, 200, { data: summary });
    return;
  }

  if (routePath === '/v1/public/market/external-benchmark') {
    const cached = await readExternalCache<ExternalMarketBenchmarkPayload>(EXTERNAL_BENCHMARK_CACHE_DOC);
    if (cached.payload && cached.fresh) {
      send(res, 200, { data: cached.payload });
      return;
    }

    const freshPayload = await buildExternalMarketBenchmarkPayload();
    if (freshPayload.items.length > 0 || !cached.payload) {
      await writeExternalCache(EXTERNAL_BENCHMARK_CACHE_DOC, freshPayload);
      send(res, 200, { data: freshPayload });
      return;
    }

    send(res, 200, { data: { ...cached.payload, stale: true } });
    return;
  }

  if (routePath === '/v1/public/market/news/digest') {
    const cached = await readExternalCache<ExternalNewsDigestPayload>(EXTERNAL_NEWS_CACHE_DOC);
    if (cached.payload && cached.fresh) {
      send(res, 200, { data: cached.payload });
      return;
    }

    const freshPayload = await buildExternalNewsDigestPayload();
    if (freshPayload.items.length > 0 || !cached.payload) {
      await writeExternalCache(EXTERNAL_NEWS_CACHE_DOC, freshPayload);
      send(res, 200, { data: freshPayload });
      return;
    }

    send(res, 200, { data: { ...cached.payload, stale: true } });
    return;
  }

  if (routePath === '/v1/public/market/climate-forecast') {
    const region = normalizeClimateRegion(req.query.region);
    const cacheId = climateCacheDocId(region);
    const cached = await readExternalCache<PublicClimateForecastPayload>(cacheId);
    if (cached.payload && cached.fresh) {
      send(res, 200, { data: cached.payload });
      return;
    }

    const freshPayload = await buildPublicClimateForecastPayload(region);
    if (freshPayload.days.length > 0 || !cached.payload) {
      await writeExternalCache(cacheId, freshPayload);
      send(res, 200, { data: freshPayload });
      return;
    }

    send(res, 200, { data: { ...cached.payload, stale: true } });
    return;
  }

  send(res, 404, { error: 'Endpoint publico de mercado nao encontrado.' });
}

const getPreviousAuditHash = async (): Promise<string> => {
  const latest = await db.collection('auditEvents').orderBy('createdAt', 'desc').limit(1).get();
  if (latest.empty) {
    return '0'.repeat(64);
  }
  return String(latest.docs[0].get('hash') || '0'.repeat(64));
};

const hashAudit = (payload: Record<string, unknown>, previousHash: string): string => {
  return createHash('sha256').update(JSON.stringify(payload) + previousHash).digest('hex');
};

const clampNumber = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const resolveSeasonByDate = (): CropSeason => {
  const month = new Date().getMonth() + 1;
  if (month >= 12 || month <= 2) return 'VERAO';
  if (month >= 3 && month <= 5) return 'OUTONO';
  if (month >= 6 && month <= 8) return 'INVERNO';
  return 'PRIMAVERA';
};

const inferStageByDays = (daysFromPlanting: number): ProducerCultureStage => {
  if (daysFromPlanting <= 7) return 'SEMENTEIRA';
  if (daysFromPlanting <= 20) return 'EMERGENCIA';
  if (daysFromPlanting <= 55) return 'VEGETATIVO';
  if (daysFromPlanting <= 85) return 'FLORACAO';
  if (daysFromPlanting <= 115) return 'FRUTIFICACAO';
  if (daysFromPlanting <= 145) return 'MATURACAO';
  return 'COLHEITA';
};

const inferConditionBySignals = (signals?: AIImageSignals): ProducerPlantCondition => {
  if (!signals) {
    return 'BOA';
  }

  const greenRatio = clampNumber(Number(signals.greenRatio ?? 0.45), 0, 1);
  const yellowRatio = clampNumber(Number(signals.yellowRatio ?? 0.2), 0, 1);
  const brownRatio = clampNumber(Number(signals.brownRatio ?? 0.1), 0, 1);
  const brightness = clampNumber(Number(signals.brightness ?? 0.55), 0, 1);

  const stressIndex = yellowRatio * 0.55 + brownRatio * 0.85 + Math.max(0, 0.45 - greenRatio) * 0.7 + Math.max(0, 0.35 - brightness) * 0.3;
  if (stressIndex >= 0.62) return 'CRITICA';
  if (stressIndex >= 0.42) return 'ATENCAO';
  if (stressIndex >= 0.26) return 'BOA';
  return 'EXCELENTE';
};

const conditionRank: Record<ProducerPlantCondition, number> = {
  CRITICA: 1,
  ATENCAO: 2,
  BOA: 3,
  EXCELENTE: 4,
};

const combineCondition = (fromSignals: ProducerPlantCondition, fromNutrient: ProducerPlantCondition): ProducerPlantCondition =>
  conditionRank[fromSignals] <= conditionRank[fromNutrient] ? fromSignals : fromNutrient;

const resolveAIResult = (payload: AIAnalyzePayload): AIAnalysisResult => {
  const imageName = String(payload.imageName ?? 'imagem-sem-nome').trim();
  const normalized = imageName.toLowerCase();
  const context = payload.context ?? {};

  const soilType = (context.soilType ?? 'MISTO') as ProducerSoilType;
  const season = (context.season ?? resolveSeasonByDate()) as CropSeason;
  const region = context.region;
  const rainfallMm = clampNumber(Number(context.rainfallMm ?? 0), 0, 220);
  const fertilizationKgHa = clampNumber(Number(context.fertilizationKgHa ?? 0), 0, 600);
  const animalHandlingDays = clampNumber(Number(context.animalHandlingDays ?? 0), 0, 90);
  const daysFromPlanting = clampNumber(Number(context.daysFromPlanting ?? 35), 0, 240);
  const stage = inferStageByDays(daysFromPlanting);

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

  const stageIdx = ['SEMENTEIRA', 'EMERGENCIA', 'VEGETATIVO', 'FLORACAO', 'FRUTIFICACAO', 'MATURACAO', 'COLHEITA'].indexOf(stage);
  const stageFactor = stageIdx >= 0 ? stageIdx * 2.8 : 0;
  const rainFactor = rainfallMm / 12;
  const fertilizerFactor = fertilizationKgHa / 20;
  const animalFactor = animalHandlingDays * 0.3;

  const nutrientIndex = clampNumber(
    42 + (soilFactorMap[soilType] ?? 0) + (seasonFactorMap[season] ?? 0) + rainFactor + fertilizerFactor + animalFactor - stageFactor * 0.3,
    0,
    100
  );
  const nutrientN = clampNumber(nutrientIndex + fertilizerFactor * 1.4 - 4, 0, 100);
  const nutrientP = clampNumber(nutrientIndex + (soilFactorMap[soilType] ?? 0) * 0.8 - 6, 0, 100);
  const nutrientK = clampNumber(nutrientIndex + rainFactor * 0.9 - 2, 0, 100);
  const estimatedProductivityKgHa = Number(
    clampNumber(1400 + nutrientIndex * 42 + rainFactor * 28 + fertilizerFactor * 36 + (seasonFactorMap[season] ?? 0) * 22, 600, 12500).toFixed(0)
  );

  const conditionByNutrient: ProducerPlantCondition =
    nutrientIndex >= 80 ? 'EXCELENTE' : nutrientIndex >= 65 ? 'BOA' : nutrientIndex >= 45 ? 'ATENCAO' : 'CRITICA';
  const conditionBySignals = inferConditionBySignals(context.imageSignals);
  const condition = combineCondition(conditionBySignals, conditionByNutrient);

  let diagnosis = 'Desenvolvimento vegetativo dentro da variacao esperada';
  let action: AIAction = 'STUDY';
  let product: string | undefined;

  if (normalized.includes('ferrugem') || normalized.includes('rust')) {
    diagnosis = 'Sinais visuais de ferrugem asiatica';
    action = 'TREAT';
    product = 'Fungicida Triazol + Estrobilurina';
  } else if (normalized.includes('praga') || normalized.includes('lagarta')) {
    diagnosis = 'Pressao de praga foliar';
    action = 'TREAT';
    product = 'Inseticida biologico (Bacillus thuringiensis)';
  } else if (condition === 'CRITICA') {
    diagnosis = 'Estresse fisiologico severo (agua/nutrientes)';
    action = 'TREAT';
    product = 'Ajuste nutricional e manejo corretivo imediato';
  } else if (condition === 'ATENCAO') {
    diagnosis = 'Sinais de deficiencia nutricional moderada';
    action = 'TREAT';
    product = 'Reforco nutricional de cobertura';
  } else if (stage === 'FLORACAO' || stage === 'FRUTIFICACAO') {
    diagnosis = 'Estagio reprodutivo com necessidade de monitoramento fino';
    action = 'STUDY';
  }

  const confidenceBase = context.imageSignals ? 82 : 70;
  const confidence = Number(clampNumber(confidenceBase + (condition === 'CRITICA' ? 6 : condition === 'ATENCAO' ? 3 : 0), 68, 96).toFixed(0));
  const recommendedN = Math.max(0, Number((85 - nutrientN).toFixed(1)));
  const recommendedP = Math.max(0, Number((80 - nutrientP).toFixed(1)));
  const recommendedK = Math.max(0, Number((82 - nutrientK).toFixed(1)));
  const recommendedNpk = `N:${recommendedN} P:${recommendedP} K:${recommendedK} kg/ha`;

  const recommendation = condition === 'CRITICA'
    ? 'Executar correcao imediata no talhao, revisar disponibilidade hidrica e fracionar adubacao conforme analise de solo.'
    : condition === 'ATENCAO'
      ? 'Ajustar adubacao de cobertura e acompanhar em 5-7 dias com nova leitura de foto e chuva acumulada.'
      : 'Manter monitoramento por estagio fenologico, validando chuva e nutricao para preservar produtividade esperada.';

  return {
    diagnosis,
    confidence,
    recommendation,
    action,
    product,
    stage,
    condition,
    nutrientN: Number(nutrientN.toFixed(1)),
    nutrientP: Number(nutrientP.toFixed(1)),
    nutrientK: Number(nutrientK.toFixed(1)),
    nutrientIndex: Number(nutrientIndex.toFixed(1)),
    estimatedProductivityKgHa,
    recommendedNpk,
    season,
    rainfallMm: Number(rainfallMm.toFixed(1)),
    region,
  };
};

async function handleCarLookup(req: Request, res: Response) {
  const uid = await requireUser(req);
  const carCode = String(req.body?.carCode ?? '').trim();

  if (!carCode || carCode.length < 6) {
    send(res, 400, { error: 'CAR invalido.' });
    return;
  }

  const ref = db.collection('carRegistry').doc(carCode);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    send(res, 404, { error: 'CAR nao encontrado.' });
    return;
  }

  const payload = snapshot.data() as CarRegistryPayload;
  await db.collection('carQueries').add({
    uid,
    carCode,
    createdAt: FieldValue.serverTimestamp(),
  });

  send(res, 200, { data: payload });
}

async function handleAIAnalyze(req: Request, res: Response) {
  const uid = await requireUser(req);
  const imageName = String(req.body?.imageName ?? 'imagem-sem-nome').trim();
  const contextRaw = req.body?.context && typeof req.body.context === 'object' ? (req.body.context as AIAnalyzeContext) : undefined;
  const context: AIAnalyzeContext = {
    cultureName: contextRaw?.cultureName ? String(contextRaw.cultureName) : undefined,
    soilType:
      contextRaw?.soilType === 'ARENOSO' ||
      contextRaw?.soilType === 'ARGILOSO' ||
      contextRaw?.soilType === 'SILTOSO' ||
      contextRaw?.soilType === 'MISTO'
        ? contextRaw.soilType
        : undefined,
    region: contextRaw?.region ? normalizeClimateRegion(contextRaw.region) : undefined,
    season:
      contextRaw?.season === 'VERAO' ||
      contextRaw?.season === 'OUTONO' ||
      contextRaw?.season === 'INVERNO' ||
      contextRaw?.season === 'PRIMAVERA'
        ? contextRaw.season
        : undefined,
    rainfallMm: Number(contextRaw?.rainfallMm ?? 0),
    fertilizationKgHa: Number(contextRaw?.fertilizationKgHa ?? 0),
    animalHandlingDays: Number(contextRaw?.animalHandlingDays ?? 0),
    daysFromPlanting: Number(contextRaw?.daysFromPlanting ?? 0),
    imageSignals: contextRaw?.imageSignals
      ? {
          greenRatio: Number(contextRaw.imageSignals.greenRatio ?? 0),
          yellowRatio: Number(contextRaw.imageSignals.yellowRatio ?? 0),
          brownRatio: Number(contextRaw.imageSignals.brownRatio ?? 0),
          brightness: Number(contextRaw.imageSignals.brightness ?? 0),
        }
      : undefined,
  };

  const result = resolveAIResult({
    imageName,
    context,
  });

  await db.collection('aiAnalyses').add({
    imageName,
    context,
    result,
    source: 'functions-v2',
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  send(res, 200, { data: result });
}

const mapHttpsStatus = (code: string): number => {
  switch (code) {
    case 'invalid-argument':
      return 400;
    case 'failed-precondition':
      return 412;
    case 'permission-denied':
      return 403;
    case 'unauthenticated':
      return 401;
    case 'not-found':
      return 404;
    case 'already-exists':
      return 409;
    default:
      return 500;
  }
};

type HttpErrorMapping = {
  status: number;
  responseBody: Record<string, unknown>;
  code: string;
};

const mapHttpError = (error: unknown): HttpErrorMapping => {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return {
      status: 401,
      responseBody: { error: 'Nao autenticado.' },
      code: 'UNAUTHORIZED',
    };
  }

  if (error instanceof HttpsError) {
    return {
      status: mapHttpsStatus(error.code),
      responseBody: { error: error.message, code: error.code },
      code: error.code,
    };
  }

  return {
    status: 500,
    responseBody: { error: 'Falha interna no backend.' },
    code: 'INTERNAL',
  };
};

const extractForwardedIp = (header: string | string[] | undefined): string | null => {
  if (!header) {
    return null;
  }
  const normalized = Array.isArray(header) ? header.join(',') : header;
  const [first] = normalized.split(',');
  const candidate = first?.trim();
  return candidate || null;
};

const extractBodyKeys = (body: unknown): string[] => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return [];
  }
  return Object.keys(body as Record<string, unknown>).slice(0, 20);
};

const logHttpError = (
  req: Request,
  routePath: string,
  source: 'api' | 'marketApi' | 'supportApi' | 'agroApi' | 'mpvCicloApi',
  mapped: HttpErrorMapping,
  error: unknown
) => {
  const payload = {
    event: 'HTTP_BACKEND_ERROR',
    source,
    method: req.method,
    path: req.path,
    routePath,
    status: mapped.status,
    code: mapped.code,
    message: error instanceof Error ? error.message : String(error),
    errorType:
      error instanceof Error
        ? error.name
        : error && typeof error === 'object'
          ? (error as { constructor?: { name?: string } }).constructor?.name ?? 'UnknownObject'
          : typeof error,
    requestId: String(req.headers['x-cloud-trace-context'] ?? ''),
    uidHint: String(req.headers['x-user-id'] ?? ''),
    ip: extractForwardedIp(req.headers['x-forwarded-for']),
    userAgent: String(req.headers['user-agent'] ?? ''),
    bodyKeys: extractBodyKeys(req.body),
    timestamp: new Date().toISOString(),
  };

  const serialized = JSON.stringify(payload);
  if (mapped.status >= 500) {
    console.error(serialized);
    return;
  }
  console.warn(serialized);
};

const handleHttpErrorResponse = (
  req: Request,
  res: Response,
  routePath: string,
  source: 'api' | 'marketApi' | 'supportApi' | 'agroApi' | 'mpvCicloApi',
  error: unknown
) => {
  const mapped = mapHttpError(error);
  logHttpError(req, routePath, source, mapped, error);
  send(res, mapped.status, mapped.responseBody);
};

const SUPPORT_MODULE_KEYS: readonly SupportModuleKey[] = ['ERP_CORE', 'MPV_CICLO', 'CEREBRO_NEXUS'] as const;

const SUPPORT_MODULE_CATALOG: Record<
  SupportModuleKey,
  {
    displayName: string;
    description: string;
    owningSystem: string;
    criticality: SupportModuleCriticality;
    defaultEnabled: boolean;
    defaultHealthPath: string;
    defaultManifestPath: string;
    defaultCapabilities: string[];
  }
> = {
  ERP_CORE: {
    displayName: 'ERP Core Consolidado',
    description: 'Nucleo canonico do PROJETO_CICLO consolidado com o legado do Sistema Ciclo +.',
    owningSystem: 'PROJETO_CICLO',
    criticality: 'CORE',
    defaultEnabled: true,
    defaultHealthPath: '/health',
    defaultManifestPath: '/v1/support/manifest',
    defaultCapabilities: ['tenant-runtime', 'audit-chain', 'market-kernel', 'support-api'],
  },
  MPV_CICLO: {
    displayName: 'MPV Ciclo',
    description: 'Middleware operacional SmartPOS + Asaas + BASE ERP isolado como modulo independente.',
    owningSystem: 'MPV CICLO',
    criticality: 'HIGH',
    defaultEnabled: false,
    defaultHealthPath: '/healthz/',
    defaultManifestPath: '/manifest',
    defaultCapabilities: ['smartpos-webhook', 'pricing-lock', 'erp-forwarding', 'scheduler-retry'],
  },
  CEREBRO_NEXUS: {
    displayName: 'Cerebro Nexus',
    description: 'Motor cognitivo de governanca por evidencias, mantido como modulo tecnico separado.',
    owningSystem: 'Projeto Ciclo Motor Cerebro NEXUS',
    criticality: 'HIGH',
    defaultEnabled: false,
    defaultHealthPath: '/health',
    defaultManifestPath: '/manifest',
    defaultCapabilities: ['governance-engine', 'evidence-validation', 'audit-export', 'signal-fusion'],
  },
};

const supportModuleRegistryCollection = (tenantId: string) =>
  db.collection('tenants').doc(tenantId).collection('moduleRegistry');

const supportModuleRegistryDoc = (tenantId: string, moduleKey: SupportModuleKey) =>
  supportModuleRegistryCollection(tenantId).doc(moduleKey);

const moduleIsoNow = (): string => new Date().toISOString();

const deriveMpvConnectionStatus = (runtime: SupportModuleRuntimePayload): 'CONNECTED' | 'DISCONNECTED' => {
  const hasRuntime = Boolean(runtime.enabled && runtime.baseUrl);
  if (!hasRuntime) {
    return 'DISCONNECTED';
  }

  const healthStatus = runtime.lastHealthCheck?.status ?? null;
  if (healthStatus === 'OFFLINE') {
    return 'DISCONNECTED';
  }

  return 'CONNECTED';
};

const deriveMpvPaymentsEnvironment = (environment?: string | null): 'PRODUCAO' | 'HOMOLOGACAO' =>
  environment === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO';

const syncMpvRuntimeToIntegrationStatus = async (
  actor: { uid: string; role: string; tenantId: string },
  runtime: SupportModuleRuntimePayload
): Promise<void> => {
  const integrationStatusCollection = db.collection('integrationStatus');
  const snapshot = await integrationStatusCollection.get();
  const targetRefs = snapshot.docs
    .filter((docSnapshot) => {
      const payload = docSnapshot.data() as Record<string, unknown>;
      const docTenantId =
        typeof payload.tenantId === 'string'
          ? payload.tenantId
          : typeof payload.tenant === 'string'
            ? payload.tenant
            : null;

      return docSnapshot.id === 'default' || docSnapshot.id === `default-${actor.tenantId}` || docTenantId === actor.tenantId;
    })
    .map((docSnapshot) => docSnapshot.ref);

  if (targetRefs.length === 0) {
    targetRefs.push(integrationStatusCollection.doc(`default-${actor.tenantId}`));
  }

  const connectionStatus = deriveMpvConnectionStatus(runtime);
  const mpvConnected = Boolean(runtime.enabled && runtime.baseUrl);

  for (const targetRef of targetRefs) {
    const existingSnapshot = await targetRef.get();
    const existingPayload = (existingSnapshot.data() ?? {}) as Record<string, unknown>;
    const existingErp =
      typeof existingPayload.erp === 'object' && existingPayload.erp !== null
        ? (existingPayload.erp as Record<string, unknown>)
        : {};
    const existingPayments =
      typeof existingPayload.payments === 'object' && existingPayload.payments !== null
        ? (existingPayload.payments as Record<string, unknown>)
        : {};
    const existingData =
      typeof existingPayload.data === 'object' && existingPayload.data !== null
        ? (existingPayload.data as Record<string, unknown>)
        : {};
    const existingSources = Array.isArray(existingData.sources)
      ? existingData.sources.filter((value): value is string => typeof value === 'string' && value !== 'MPV Ciclo')
      : [];
    const nextSources = mpvConnected ? [...existingSources, 'MPV Ciclo'] : existingSources;

    await targetRef.set(
      {
        tenantId: typeof existingPayload.tenantId === 'string' ? existingPayload.tenantId : actor.tenantId,
        erp: {
          ...existingErp,
          provider: 'MPV Ciclo (ERP + PDV)',
          status: connectionStatus,
          updatedAt: moduleIsoNow(),
        },
        payments: {
          ...existingPayments,
          status: connectionStatus,
          environment: deriveMpvPaymentsEnvironment(runtime.environment),
          updatedAt: moduleIsoNow(),
        },
        data: {
          ...existingData,
          sources: nextSources,
        },
      },
      { merge: true }
    );
  }
};

const normalizeSupportModuleKey = (value: unknown): SupportModuleKey => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();

  if (normalized === 'ERP_CORE') return 'ERP_CORE';
  if (normalized === 'MPV_CICLO') return 'MPV_CICLO';
  if (normalized === 'CEREBRO_NEXUS') return 'CEREBRO_NEXUS';
  throw new HttpsError('invalid-argument', 'moduleKey invalido.');
};

const normalizeSupportModuleEnvironment = (value: unknown, fallback: SupportModuleEnvironment = 'LOCAL'): SupportModuleEnvironment => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();

  if (normalized === 'HOMOLOGACAO' || normalized === 'PRODUCAO') {
    return normalized as SupportModuleEnvironment;
  }
  return fallback;
};

const normalizeSupportModuleAuthMode = (value: unknown, fallback: SupportModuleAuthMode = 'NONE'): SupportModuleAuthMode => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();

  if (normalized === 'BEARER' || normalized === 'API_KEY') {
    return normalized as SupportModuleAuthMode;
  }
  return fallback;
};

const sanitizeModuleBaseUrl = (value: unknown): string => String(value ?? '').trim().replace(/\/+$/, '');

const parseBooleanEnv = (value: unknown, fallback: boolean): boolean => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
};

const parseStringListEnv = (value: unknown): string[] => {
  if (typeof value !== 'string') {
    return [];
  }
  const normalized = value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return Array.from(new Set(normalized));
};

const sanitizeModulePath = (value: unknown, fallback: string): string => {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return fallback;
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

const normalizeModuleCapabilities = (value: unknown, fallback: readonly string[]): string[] => {
  if (!Array.isArray(value)) {
    if (typeof value === 'string') {
      const parsed = parseStringListEnv(value);
      if (parsed.length > 0) {
        return parsed;
      }
    }
    return [...fallback];
  }

  return Array.from(new Set(value.map((entry) => String(entry).trim()).filter(Boolean)));
};

const SUPPORT_MODULE_ENV_PREFIX = 'SUPPORT_MODULE';
const DEFAULT_SUPPORT_MODULE_ENVIRONMENT: SupportModuleEnvironment = NODE_ENV === 'production' ? 'PRODUCAO' : 'LOCAL';
const SUPPORT_MODULE_NEXUS_GATEWAY = sanitizeModuleBaseUrl(process.env.SUPPORT_MODULE_NEXUS_GATEWAY_URL);
const SUPPORT_MODULE_REQUEST_TIMEOUT_MS = 5000;
const SUPPORT_MODULE_NEXUS_HEALTH_PATH = '/v1/support/modules/health';
const SUPPORT_MODULE_NEXUS_MANIFEST_PATH = '/v1/support/modules/manifest';

const resolveSupportModuleSeedFromEnv = (moduleKey: SupportModuleKey): SupportModuleRuntimeSeed => {
  const catalog = SUPPORT_MODULE_CATALOG[moduleKey];
  const envPrefix = `${SUPPORT_MODULE_ENV_PREFIX}_${moduleKey}`;
  const baseUrl = sanitizeModuleBaseUrl(process.env[`${envPrefix}_BASE_URL`]);
  const rawEnabled = process.env[`${envPrefix}_ENABLED`];
  const enabled =
    typeof rawEnabled === 'string'
      ? parseBooleanEnv(rawEnabled, catalog.defaultEnabled)
      : Boolean(baseUrl) || catalog.defaultEnabled;

  return {
    baseUrl,
    healthPath: sanitizeModulePath(process.env[`${envPrefix}_HEALTH_PATH`], catalog.defaultHealthPath),
    manifestPath: sanitizeModulePath(process.env[`${envPrefix}_MANIFEST_PATH`], catalog.defaultManifestPath),
    environment: normalizeSupportModuleEnvironment(process.env[`${envPrefix}_ENVIRONMENT`], DEFAULT_SUPPORT_MODULE_ENVIRONMENT),
    authMode: normalizeSupportModuleAuthMode(process.env[`${envPrefix}_AUTH_MODE`], 'NONE'),
    credentialRef: String(process.env[`${envPrefix}_CREDENTIAL_REF`] ?? '').trim(),
    enabled,
    capabilities: normalizeModuleCapabilities(
      process.env[`${envPrefix}_CAPABILITIES`],
      catalog.defaultCapabilities
    ),
  };
};

const SUPPORT_MODULE_ENV_DEFAULTS: Record<SupportModuleKey, SupportModuleRuntimeSeed> = {
  ERP_CORE: resolveSupportModuleSeedFromEnv('ERP_CORE'),
  MPV_CICLO: resolveSupportModuleSeedFromEnv('MPV_CICLO'),
  CEREBRO_NEXUS: resolveSupportModuleSeedFromEnv('CEREBRO_NEXUS'),
};

const hasSupportModuleEnvConfig = (moduleKey: SupportModuleKey): boolean => {
  const envPrefix = `${SUPPORT_MODULE_ENV_PREFIX}_${moduleKey}`;
  const envKeys = [
    `${envPrefix}_BASE_URL`,
    `${envPrefix}_HEALTH_PATH`,
    `${envPrefix}_MANIFEST_PATH`,
    `${envPrefix}_ENVIRONMENT`,
    `${envPrefix}_AUTH_MODE`,
    `${envPrefix}_CREDENTIAL_REF`,
    `${envPrefix}_ENABLED`,
    `${envPrefix}_CAPABILITIES`,
  ] as const;

  return envKeys.some((name) => {
    const value = process.env[name];
    return typeof value === 'string' && value.trim().length > 0;
  });
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const NEXUS_SIGNAL_DEFAULT_LIMIT = 25;
const NEXUS_SIGNAL_MAX_LIMIT = 100;

const nexusSignalCollection = (tenantId: string) => db.collection('tenants').doc(tenantId).collection('nexusSignals');
const nexusSummaryDoc = (tenantId: string) => db.collection('monitoring').doc('nexus').collection('tenants').doc(tenantId);

const toCounterRecord = (value: unknown): Record<string, number> => {
  const raw = asRecord(value);
  if (!raw) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw)
      .filter(([, entryValue]) => typeof entryValue === 'number' && Number.isFinite(entryValue))
      .map(([key, entryValue]) => [key, Number(entryValue)])
  );
};

const normalizeNexusSignalsLimit = (value: unknown): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return NEXUS_SIGNAL_DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(NEXUS_SIGNAL_MAX_LIMIT, Math.trunc(parsed)));
};

const normalizeTag = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const extractModuleStatusesFromPayload = (payload: Record<string, unknown>): string[] => {
  const modules = payload.modules;
  if (!Array.isArray(modules)) {
    return [];
  }

  return modules
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry))
    .map((entry) => String(entry.status ?? '').trim().toUpperCase())
    .filter(Boolean);
};

const hasAuditToken = (audit: TenantAuditLogPayload, token: string): boolean => {
  const lookup = [audit.stream, audit.eventType, audit.operationType].map((entry) => entry.toUpperCase());
  return lookup.some((entry) => entry.includes(token));
};

const inferNexusSignalDomain = (audit: TenantAuditLogPayload): NexusSignalDomain => {
  if (hasAuditToken(audit, 'MODULE') || hasAuditToken(audit, 'INTEGRATION')) {
    return 'INTEGRATION';
  }
  if (hasAuditToken(audit, 'SUPPORT') || hasAuditToken(audit, 'DISPUTE')) {
    return 'SUPPORT';
  }
  if (hasAuditToken(audit, 'APPROVAL') || hasAuditToken(audit, 'AUDIT') || hasAuditToken(audit, 'GOVERNANCE')) {
    return 'GOVERNANCE';
  }
  return 'MARKET';
};

const inferNexusSignalSeverity = (audit: TenantAuditLogPayload): NexusSignalSeverity => {
  const payload = audit.payload;
  const moduleStatuses = extractModuleStatusesFromPayload(payload);
  const decision = String(payload.decision ?? '').trim().toUpperCase();

  if (audit.eventType === 'MODULE_RUNTIME_HEALTHCHECKED') {
    if (moduleStatuses.includes('OFFLINE')) {
      return 'CRITICAL';
    }
    if (moduleStatuses.some((entry) => entry === 'DEGRADED' || entry === 'UNCONFIGURED')) {
      return 'WARNING';
    }
  }

  if (audit.status === 'REJECTED' && hasAuditToken(audit, 'SETTLEMENT')) {
    return 'CRITICAL';
  }

  if (
    audit.status === 'REJECTED' ||
    audit.eventType === 'DISPUTE_OPENED' ||
    audit.eventType === 'SUPPORT_TICKET_OPENED' ||
    audit.eventType === 'SUPPORT_APPROVAL_REQUESTED' ||
    (audit.eventType === 'SUPPORT_APPROVAL_DECIDED' && decision === 'REJECTED')
  ) {
    return 'WARNING';
  }

  return 'INFO';
};

const buildNexusSignalSummary = (audit: TenantAuditLogPayload, severity: NexusSignalSeverity): string => {
  const payload = audit.payload;
  const moduleStatuses = extractModuleStatusesFromPayload(payload);
  const moduleKey = String(payload.moduleKey ?? '').trim();
  const decision = String(payload.decision ?? '').trim().toUpperCase();

  if (audit.eventType === 'MODULE_RUNTIME_HEALTHCHECKED') {
    const offline = moduleStatuses.filter((entry) => entry === 'OFFLINE').length;
    const degraded = moduleStatuses.filter((entry) => entry === 'DEGRADED' || entry === 'UNCONFIGURED').length;

    if (offline > 0) {
      return `${offline} modulo(s) offline no health-check observado pelo Nexus.`;
    }
    if (degraded > 0) {
      return `${degraded} modulo(s) degradados ou sem configuracao no health-check.`;
    }
    return 'Health-check dos modulos concluido sem falhas relevantes.';
  }

  if (audit.eventType === 'MODULE_RUNTIME_UPSERTED') {
    return `Runtime do modulo ${moduleKey || 'desconhecido'} atualizado para governanca operacional.`;
  }

  if (audit.status === 'REJECTED') {
    return `Operacao ${audit.operationType} rejeitada pelo kernel e sinalizada ao Nexus.`;
  }

  switch (audit.eventType) {
    case 'DISPUTE_OPENED':
      return 'Disputa aberta e encaminhada para acompanhamento operacional.';
    case 'DISPUTE_RESOLVED':
      return 'Disputa resolvida com evidencias auditaveis encadeadas.';
    case 'SUPPORT_TICKET_OPENED':
      return 'Ticket de suporte aberto para tratativa do tenant.';
    case 'SUPPORT_MESSAGE_ADDED':
      return 'Ticket de suporte recebeu nova interacao.';
    case 'SUPPORT_APPROVAL_REQUESTED':
      return 'Solicitacao de aprovacao criada e aguardando decisao.';
    case 'SUPPORT_APPROVAL_DECIDED':
      return decision === 'REJECTED'
        ? 'Solicitacao de aprovacao rejeitada e requer revisao operacional.'
        : 'Solicitacao de aprovacao concluida com sucesso.';
    case 'SPLIT_RELEASED':
      return 'Liberacao de liquidacao concluida com registro encadeado.';
    default:
      return severity === 'CRITICAL'
        ? `Evento critico ${audit.eventType} observado pelo Nexus.`
        : `Evento ${audit.eventType} observado pelo Nexus.`;
  }
};

const buildNexusRecommendedAction = (audit: TenantAuditLogPayload): string => {
  const payload = audit.payload;
  const moduleStatuses = extractModuleStatusesFromPayload(payload);

  if (audit.eventType === 'MODULE_RUNTIME_HEALTHCHECKED') {
    if (moduleStatuses.includes('OFFLINE')) {
      return 'Verificar endpoint, credencial e disponibilidade do modulo afetado antes do proximo ciclo.';
    }
    if (moduleStatuses.some((entry) => entry === 'DEGRADED' || entry === 'UNCONFIGURED')) {
      return 'Corrigir configuracao ou latencia do modulo e repetir o health-check.';
    }
    return 'Manter o monitoramento continuo dos modulos integrados.';
  }

  if (audit.status === 'REJECTED') {
    return 'Revisar pre-condicoes, permissoes e evidencias do fluxo rejeitado.';
  }

  if (audit.eventType === 'DISPUTE_OPENED' || audit.eventType === 'SUPPORT_TICKET_OPENED') {
    return 'Consolidar evidencias no chamado e priorizar a tratativa do caso.';
  }

  if (audit.eventType === 'SUPPORT_APPROVAL_REQUESTED') {
    return 'Direcionar a aprovacao para a fila responsavel e monitorar o SLA.';
  }

  return 'Registrar o sinal no historico operacional e manter observacao da cadeia auditavel.';
};

const buildNexusTags = (
  audit: TenantAuditLogPayload,
  severity: NexusSignalSeverity,
  domain: NexusSignalDomain
): string[] => {
  const payload = audit.payload;
  const baseTags = [
    audit.stream,
    audit.eventType,
    audit.operationType,
    audit.status,
    severity,
    domain,
    String(payload.moduleKey ?? ''),
    String(payload.decision ?? ''),
  ];

  return Array.from(new Set(baseTags.map((entry) => normalizeTag(entry)).filter(Boolean)));
};

const toTenantAuditLogPayload = (
  tenantId: string,
  auditId: string,
  value: Record<string, unknown>
): TenantAuditLogPayload => ({
  id: String(value.id ?? auditId),
  tenantId,
  stream: String(value.stream ?? 'default'),
  sequence: Number(value.sequence ?? 0),
  eventType: String(value.eventType ?? 'UNKNOWN_EVENT'),
  operationType: String(value.operationType ?? value.eventType ?? 'UNKNOWN_OPERATION'),
  status: String(value.status ?? 'UNKNOWN'),
  actorUid: String(value.actorUid ?? ''),
  actorRole: String(value.actorRole ?? ''),
  payload: asRecord(value.payload) ?? {},
  hash: String(value.hash ?? ''),
  prevHash: String(value.prevHash ?? ''),
  createdAtIso: String(value.createdAtIso ?? moduleIsoNow()),
});

const buildNexusSignalFromAudit = (audit: TenantAuditLogPayload): NexusSignalPayload => {
  const domain = inferNexusSignalDomain(audit);
  const severity = inferNexusSignalSeverity(audit);

  return {
    id: audit.id,
    tenantId: audit.tenantId,
    auditId: audit.id,
    sequence: audit.sequence,
    stream: audit.stream,
    eventType: audit.eventType,
    operationType: audit.operationType,
    auditStatus: audit.status,
    actorUid: audit.actorUid,
    actorRole: audit.actorRole,
    eventCreatedAtIso: audit.createdAtIso,
    observedAtIso: moduleIsoNow(),
    severity,
    domain,
    summary: buildNexusSignalSummary(audit, severity),
    recommendedAction: buildNexusRecommendedAction(audit),
    tags: buildNexusTags(audit, severity, domain),
    sourceSystem: 'ERP_CORE',
    payload: audit.payload,
    hash: audit.hash,
    prevHash: audit.prevHash,
  };
};

const toNexusSignalPayload = (tenantId: string, signalId: string, value: Record<string, unknown>): NexusSignalPayload => ({
  id: String(value.id ?? signalId),
  tenantId,
  auditId: String(value.auditId ?? signalId),
  sequence: Number(value.sequence ?? 0),
  stream: String(value.stream ?? 'default'),
  eventType: String(value.eventType ?? 'UNKNOWN_EVENT'),
  operationType: String(value.operationType ?? 'UNKNOWN_OPERATION'),
  auditStatus: String(value.auditStatus ?? 'UNKNOWN'),
  actorUid: String(value.actorUid ?? ''),
  actorRole: String(value.actorRole ?? ''),
  eventCreatedAtIso: String(value.eventCreatedAtIso ?? moduleIsoNow()),
  observedAtIso: String(value.observedAtIso ?? moduleIsoNow()),
  severity:
    String(value.severity ?? 'INFO').toUpperCase() === 'CRITICAL'
      ? 'CRITICAL'
      : String(value.severity ?? 'INFO').toUpperCase() === 'WARNING'
        ? 'WARNING'
        : 'INFO',
  domain:
    String(value.domain ?? 'MARKET').toUpperCase() === 'SUPPORT'
      ? 'SUPPORT'
      : String(value.domain ?? 'MARKET').toUpperCase() === 'INTEGRATION'
        ? 'INTEGRATION'
        : String(value.domain ?? 'MARKET').toUpperCase() === 'GOVERNANCE'
          ? 'GOVERNANCE'
          : 'MARKET',
  summary: String(value.summary ?? ''),
  recommendedAction: String(value.recommendedAction ?? ''),
  tags: Array.isArray(value.tags) ? value.tags.map((entry) => String(entry)).filter(Boolean) : [],
  sourceSystem: 'ERP_CORE',
  payload: asRecord(value.payload) ?? {},
  hash: String(value.hash ?? ''),
  prevHash: String(value.prevHash ?? ''),
});

const toNexusSummaryPayload = (
  tenantId: string,
  value: Record<string, unknown> | undefined
): NexusSignalSummaryPayload => ({
  tenantId,
  totalSignals: Number(value?.totalSignals ?? 0),
  lastSignalAtIso: value?.lastSignalAtIso ? String(value.lastSignalAtIso) : undefined,
  lastSeverity: value?.lastSeverity
    ? (String(value.lastSeverity).toUpperCase() === 'CRITICAL'
        ? 'CRITICAL'
        : String(value.lastSeverity).toUpperCase() === 'WARNING'
          ? 'WARNING'
          : 'INFO')
    : undefined,
  lastEventType: value?.lastEventType ? String(value.lastEventType) : undefined,
  lastSummary: value?.lastSummary ? String(value.lastSummary) : undefined,
  lastAuditSequence: typeof value?.lastAuditSequence === 'number' ? value.lastAuditSequence : undefined,
  severityCounts: toCounterRecord(value?.severityCounts),
  domainCounts: toCounterRecord(value?.domainCounts),
  statusCounts: toCounterRecord(value?.statusCounts),
});

const persistNexusSignal = async (signal: NexusSignalPayload): Promise<void> => {
  const signalRef = nexusSignalCollection(signal.tenantId).doc(signal.id);
  const summaryRef = nexusSummaryDoc(signal.tenantId);

  await db.runTransaction(async (tx) => {
    const [signalSnapshot, summarySnapshot] = await Promise.all([tx.get(signalRef), tx.get(summaryRef)]);
    if (signalSnapshot.exists) {
      return;
    }

    const currentSummary = summarySnapshot.exists ? (summarySnapshot.data() as Record<string, unknown>) : {};
    const severityCounts = toCounterRecord(currentSummary.severityCounts);
    severityCounts[signal.severity] = (severityCounts[signal.severity] ?? 0) + 1;

    const domainCounts = toCounterRecord(currentSummary.domainCounts);
    domainCounts[signal.domain] = (domainCounts[signal.domain] ?? 0) + 1;

    const statusCounts = toCounterRecord(currentSummary.statusCounts);
    statusCounts[signal.auditStatus] = (statusCounts[signal.auditStatus] ?? 0) + 1;

    tx.set(
      signalRef,
      {
        ...signal,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    tx.set(
      summaryRef,
      {
        tenantId: signal.tenantId,
        totalSignals: Number(currentSummary.totalSignals ?? 0) + 1,
        lastSignalAtIso: signal.observedAtIso,
        lastSeverity: signal.severity,
        lastEventType: signal.eventType,
        lastSummary: signal.summary,
        lastAuditSequence: signal.sequence,
        severityCounts,
        domainCounts,
        statusCounts,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
};

const loadNexusSignals = async (
  actor: { uid: string; role: string; tenantId: string },
  limit: number
): Promise<{ summary: NexusSignalSummaryPayload; signals: NexusSignalPayload[] }> => {
  const [signalsSnapshot, summarySnapshot] = await Promise.all([
    nexusSignalCollection(actor.tenantId).orderBy('observedAtIso', 'desc').limit(limit).get(),
    nexusSummaryDoc(actor.tenantId).get(),
  ]);

  return {
    summary: toNexusSummaryPayload(
      actor.tenantId,
      summarySnapshot.exists ? (summarySnapshot.data() as Record<string, unknown>) : undefined
    ),
    signals: signalsSnapshot.docs.map((docSnapshot) =>
      toNexusSignalPayload(actor.tenantId, docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    ),
  };
};

const pickManifestFromPayload = (value: unknown): Record<string, unknown> | null => {
  const raw = asRecord(value);
  if (!raw) {
    return null;
  }

  if (asRecord(raw.manifest)) {
    return asRecord(raw.manifest);
  }
  if (asRecord(raw.data)) {
    return asRecord(raw.data);
  }
  return raw;
};

const fetchJsonWithTimeout = async (
  url: string,
  init: RequestInit = {},
  timeoutMs: number = SUPPORT_MODULE_REQUEST_TIMEOUT_MS
): Promise<{ ok: boolean; status: number; payload: unknown }> => {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const body = await response.text().catch(() => '');
    let payload = null;
    if (body) {
      try {
        payload = JSON.parse(body);
      } catch {
        payload = null;
      }
    }

    return { ok: response.ok, status: response.status, payload };
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const resolveNexusGatewayHealthUrl = (): string | null => {
  if (!SUPPORT_MODULE_NEXUS_GATEWAY) {
    return null;
  }
  return `${SUPPORT_MODULE_NEXUS_GATEWAY}${SUPPORT_MODULE_NEXUS_HEALTH_PATH}`;
};

const resolveNexusGatewayManifestUrl = (): string | null => {
  if (!SUPPORT_MODULE_NEXUS_GATEWAY) {
    return null;
  }
  return `${SUPPORT_MODULE_NEXUS_GATEWAY}${SUPPORT_MODULE_NEXUS_MANIFEST_PATH}`;
};

const toSupportModuleHealth = (value: unknown): SupportModuleHealthPayload | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const normalizedStatus = String(raw.status ?? '').trim().toUpperCase();
  const status: SupportModuleHealthStatus =
    normalizedStatus === 'ONLINE' ||
    normalizedStatus === 'OFFLINE' ||
    normalizedStatus === 'DISABLED' ||
    normalizedStatus === 'DEGRADED'
      ? (normalizedStatus as SupportModuleHealthStatus)
      : 'UNCONFIGURED';

  return {
    status,
    checkedAt: String(raw.checkedAt ?? moduleIsoNow()),
    message: String(raw.message ?? ''),
    targetUrl: raw.targetUrl ? String(raw.targetUrl) : undefined,
    latencyMs: typeof raw.latencyMs === 'number' ? raw.latencyMs : undefined,
    httpStatus: typeof raw.httpStatus === 'number' ? raw.httpStatus : undefined,
  };
};

const toSupportModuleRuntime = (
  moduleKey: SupportModuleKey,
  value: Record<string, unknown> | undefined
): SupportModuleRuntimePayload => {
  const catalog = SUPPORT_MODULE_CATALOG[moduleKey];
  const seed = SUPPORT_MODULE_ENV_DEFAULTS[moduleKey];
  const raw = value ?? {};
  const rawCriticality = String(raw.criticality ?? catalog.criticality).trim().toUpperCase();
  const criticality: SupportModuleCriticality =
    rawCriticality === 'CORE' || rawCriticality === 'HIGH' || rawCriticality === 'MEDIUM'
      ? (rawCriticality as SupportModuleCriticality)
      : catalog.criticality;

  return {
    moduleKey,
    displayName: String(raw.displayName ?? catalog.displayName),
    description: String(raw.description ?? catalog.description),
    owningSystem: String(raw.owningSystem ?? catalog.owningSystem),
    criticality,
    baseUrl: sanitizeModuleBaseUrl(raw.baseUrl ?? seed.baseUrl),
    healthPath: sanitizeModulePath(raw.healthPath ?? seed.healthPath, seed.healthPath),
    manifestPath: sanitizeModulePath(raw.manifestPath ?? seed.manifestPath, seed.manifestPath),
    environment: normalizeSupportModuleEnvironment(raw.environment, seed.environment),
    authMode: normalizeSupportModuleAuthMode(raw.authMode, seed.authMode),
    credentialRef: String(raw.credentialRef ?? seed.credentialRef).trim(),
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : seed.enabled,
    capabilities: normalizeModuleCapabilities(raw.capabilities ?? seed.capabilities, seed.capabilities),
    lastConfiguredAt: raw.lastConfiguredAt ? String(raw.lastConfiguredAt) : undefined,
    lastConfiguredBy: raw.lastConfiguredBy ? String(raw.lastConfiguredBy) : undefined,
    lastHealthCheck: toSupportModuleHealth(raw.lastHealthCheck),
  };
};

const executeSupportModuleHealthCheckFromDirect = async (
  targetUrl: string
): Promise<SupportModuleHealthPayload> => {
  const startedAt = Date.now();

  const response = await fetchJsonWithTimeout(targetUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const latencyMs = Date.now() - startedAt;
  const responseBody = asRecord(response.payload);
  const message =
    responseBody && typeof responseBody.status === 'string'
      ? responseBody.status
      : responseBody && typeof responseBody.message === 'string'
        ? responseBody.message
        : response.ok
          ? 'Health-check OK.'
          : `HTTP ${response.status}`;

  return {
    status: response.ok ? (latencyMs > 1500 ? 'DEGRADED' : 'ONLINE') : 'OFFLINE',
    checkedAt: moduleIsoNow(),
    message,
    targetUrl,
    latencyMs,
    httpStatus: response.status,
  };
};

const executeSupportModuleHealthCheckViaNexus = async (
  runtime: SupportModuleRuntimePayload
): Promise<SupportModuleHealthPayload | null> => {
  const gatewayUrl = resolveNexusGatewayHealthUrl();
  if (!gatewayUrl || !runtime.baseUrl) {
    return null;
  }

  const response = await fetchJsonWithTimeout(
    gatewayUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        moduleKey: runtime.moduleKey,
        baseUrl: runtime.baseUrl,
        healthPath: runtime.healthPath,
        manifestPath: runtime.manifestPath,
        environment: runtime.environment,
        authMode: runtime.authMode,
        credentialRef: runtime.credentialRef,
      }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const health = toSupportModuleHealth(response.payload);
  const sourceHealthMessage = asRecord(response.payload)?.message;

  return {
    status: health ? (health.status === 'UNCONFIGURED' ? 'DEGRADED' : health.status) : 'DEGRADED',
    checkedAt: health?.checkedAt ?? moduleIsoNow(),
    message:
      health?.message ||
      (typeof sourceHealthMessage === 'string' ? sourceHealthMessage : 'Health-check via gateway de Nexus.'),
    targetUrl: gatewayUrl,
    latencyMs: health?.latencyMs,
    httpStatus: health?.httpStatus,
  };
};

const executeSupportModuleManifestFromDirect = async (
  runtime: SupportModuleRuntimePayload
): Promise<SupportModuleManifestPayload | null> => {
  if (!runtime.baseUrl) {
    return null;
  }

  const targetUrl = `${runtime.baseUrl}${runtime.manifestPath}`;
  const startedAt = Date.now();
  const response = await fetchJsonWithTimeout(targetUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const latencyMs = Date.now() - startedAt;
  if (!response.ok) {
    return null;
  }

  const manifest = pickManifestFromPayload(response.payload);
  if (!manifest) {
    return null;
  }

  const health = toSupportModuleHealth(response.payload);
  return {
    moduleKey: runtime.moduleKey,
    displayName: runtime.displayName,
    description: runtime.description,
    owningSystem: runtime.owningSystem,
    capabilities: runtime.capabilities,
    healthPath: runtime.healthPath,
    manifestPath: runtime.manifestPath,
    source: 'DIRECT',
    status: response.ok ? (latencyMs > 1500 ? 'DEGRADED' : 'ONLINE') : 'OFFLINE',
    sourceUrl: targetUrl,
    message: 'Manifesto carregado direto.',
    checkedAt: moduleIsoNow(),
    runtimeTargetUrl: targetUrl,
    manifest,
    runtimeHealthMessage: health?.message ?? 'Manifesto carregado direto.',
  };
};

const executeSupportModuleManifestViaNexus = async (
  runtime: SupportModuleRuntimePayload
): Promise<SupportModuleManifestPayload | null> => {
  const gatewayUrl = resolveNexusGatewayManifestUrl();
  if (!gatewayUrl || !runtime.baseUrl) {
    return null;
  }

  const response = await fetchJsonWithTimeout(
    gatewayUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        moduleKey: runtime.moduleKey,
        baseUrl: runtime.baseUrl,
        healthPath: runtime.healthPath,
        manifestPath: runtime.manifestPath,
        environment: runtime.environment,
      }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const manifest = pickManifestFromPayload(response.payload);
  if (!manifest) {
    return null;
  }

  const health = toSupportModuleHealth(response.payload);
  return {
    moduleKey: runtime.moduleKey,
    displayName: runtime.displayName,
    description: runtime.description,
    owningSystem: runtime.owningSystem,
    capabilities: runtime.capabilities,
    healthPath: runtime.healthPath,
    manifestPath: runtime.manifestPath,
    source: 'NEXUS',
    status: health ? (health.status === 'UNCONFIGURED' ? 'DEGRADED' : health.status) : 'DEGRADED',
    sourceUrl: gatewayUrl,
    message: 'Manifesto obtido via gateway de Nexus.',
    checkedAt: health?.checkedAt ?? moduleIsoNow(),
    runtimeTargetUrl: `${runtime.baseUrl}${runtime.healthPath}`,
    runtimeHealthMessage: health?.message ?? 'Manifesto obtido via gateway de Nexus.',
    manifest,
  };
};

const resolveSupportModuleManifest = async (
  runtime: SupportModuleRuntimePayload
): Promise<SupportModuleManifestPayload> => {
  if (!runtime.enabled) {
    return {
      moduleKey: runtime.moduleKey,
      displayName: runtime.displayName,
      description: runtime.description,
      owningSystem: runtime.owningSystem,
      capabilities: runtime.capabilities,
      healthPath: runtime.healthPath,
      manifestPath: runtime.manifestPath,
      source: 'CATALOG',
      status: 'DISABLED',
      sourceUrl: runtime.baseUrl ? `${runtime.baseUrl}${runtime.manifestPath}` : '',
      checkedAt: moduleIsoNow(),
      message: 'Modulo desabilitado para runtime real.',
      runtimeTargetUrl: runtime.baseUrl ? `${runtime.baseUrl}${runtime.healthPath}` : '',
    };
  }

  if (!runtime.baseUrl) {
    return {
      moduleKey: runtime.moduleKey,
      displayName: runtime.displayName,
      description: runtime.description,
      owningSystem: runtime.owningSystem,
      capabilities: runtime.capabilities,
      healthPath: runtime.healthPath,
      manifestPath: runtime.manifestPath,
      source: 'CATALOG',
      status: 'UNCONFIGURED',
      sourceUrl: runtime.manifestPath,
      checkedAt: moduleIsoNow(),
      message: 'Base URL do modulo nao configurada.',
    };
  }

  const direct = await executeSupportModuleManifestFromDirect(runtime);
  if (direct) {
    return direct;
  }

  const viaNexus = await executeSupportModuleManifestViaNexus(runtime);
  if (viaNexus) {
    return viaNexus;
  }

  return {
    moduleKey: runtime.moduleKey,
    displayName: runtime.displayName,
    description: runtime.description,
    owningSystem: runtime.owningSystem,
    capabilities: runtime.capabilities,
    healthPath: runtime.healthPath,
    manifestPath: runtime.manifestPath,
    source: 'CATALOG',
    status: 'UNCONFIGURED',
    sourceUrl: `${runtime.baseUrl}${runtime.manifestPath}`,
    checkedAt: moduleIsoNow(),
    message: 'Manifesto indisponivel direto e via gateway de Nexus.',
    runtimeTargetUrl: `${runtime.baseUrl}${runtime.healthPath}`,
  };
};

const assertModuleControlAccess = (actor: { uid: string; role: string; tenantId: string }) => {
  if (!MODULE_CONTROL_ALLOWED_ROLES.has(actor.role)) {
    throw new HttpsError('permission-denied', 'Perfil sem permissao para governanca de modulos.');
  }
};

const loadSupportModules = async (
  actor: { uid: string; role: string; tenantId: string }
): Promise<SupportModuleRuntimePayload[]> => {
  const snapshot = await supportModuleRegistryCollection(actor.tenantId).get();
  const rawById = new Map(snapshot.docs.map((docSnapshot) => [docSnapshot.id, docSnapshot.data() as Record<string, unknown>]));
  const modules = SUPPORT_MODULE_KEYS.map((moduleKey) => toSupportModuleRuntime(moduleKey, rawById.get(moduleKey)));
  const toSeed = modules.filter(
    (entry) =>
      hasSupportModuleEnvConfig(entry.moduleKey) &&
      entry.enabled &&
      !rawById.has(entry.moduleKey)
  );

  const seeded = toSeed.filter((entry) => {
    try {
      ensureSupportModuleRuntimeIsValid(entry);
      return true;
    } catch {
      return false;
    }
  });

  if (seeded.length > 0) {
    await Promise.all(seeded.map((entry) => persistSupportModuleRuntime(actor, entry)));
  }

  return modules;
};

const ensureSupportModuleRuntimeIsValid = (runtime: SupportModuleRuntimePayload) => {
  if (!runtime.enabled) {
    return;
  }

  if (runtime.moduleKey !== 'ERP_CORE' && !runtime.baseUrl) {
    throw new HttpsError('invalid-argument', 'baseUrl obrigatoria para modulo externo habilitado.');
  }

  if (runtime.environment !== 'LOCAL' && runtime.baseUrl && !runtime.baseUrl.startsWith('https://')) {
    throw new HttpsError('invalid-argument', 'Modulos em homologacao/producao devem usar HTTPS.');
  }

  if (runtime.moduleKey !== 'ERP_CORE' && runtime.authMode !== 'NONE' && !runtime.credentialRef) {
    throw new HttpsError('invalid-argument', 'credentialRef obrigatoria para modulo protegido.');
  }
};

const persistSupportModuleRuntime = async (
  actor: { uid: string; role: string; tenantId: string },
  runtime: SupportModuleRuntimePayload
) => {
  const docRef = supportModuleRegistryDoc(actor.tenantId, runtime.moduleKey);
  const snapshot = await docRef.get();
  const currentCreatedAt = snapshot.exists ? snapshot.get('createdAt') : null;
  const currentLastConfiguredAt = snapshot.exists ? snapshot.get('lastConfiguredAt') : null;
  const currentLastConfiguredBy = snapshot.exists ? snapshot.get('lastConfiguredBy') : null;

  const payload: Record<string, unknown> = {
    id: runtime.moduleKey,
    tenantId: actor.tenantId,
    moduleKey: runtime.moduleKey,
    displayName: runtime.displayName,
    description: runtime.description,
    owningSystem: runtime.owningSystem,
    criticality: runtime.criticality,
    baseUrl: runtime.baseUrl,
    healthPath: runtime.healthPath,
    manifestPath: runtime.manifestPath,
    environment: runtime.environment,
    authMode: runtime.authMode,
    credentialRef: runtime.credentialRef,
    enabled: runtime.enabled,
    capabilities: runtime.capabilities,
    lastConfiguredAt: runtime.lastConfiguredAt ?? currentLastConfiguredAt ?? null,
    lastConfiguredBy: runtime.lastConfiguredBy ?? currentLastConfiguredBy ?? null,
    lastHealthCheck: runtime.lastHealthCheck ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  payload.createdAt = currentCreatedAt ?? FieldValue.serverTimestamp();

  await docRef.set(payload, { merge: true });

  if (runtime.moduleKey === 'MPV_CICLO') {
    await syncMpvRuntimeToIntegrationStatus(actor, runtime);
  }
};

const executeSupportModuleHealthCheck = async (
  runtime: SupportModuleRuntimePayload
): Promise<SupportModuleHealthPayload> => {
  if (!runtime.enabled) {
    return {
      status: 'DISABLED',
      checkedAt: moduleIsoNow(),
      message: 'Modulo desabilitado para runtime real.',
    };
  }

  if (!runtime.baseUrl) {
    return {
      status: 'UNCONFIGURED',
      checkedAt: moduleIsoNow(),
      message: 'Base URL nao configurada.',
    };
  }

  if (runtime.moduleKey !== 'ERP_CORE' && runtime.authMode !== 'NONE' && !runtime.credentialRef) {
    return {
      status: 'DEGRADED',
      checkedAt: moduleIsoNow(),
      message: 'Modulo protegido sem referencia de credencial segura.',
      targetUrl: `${runtime.baseUrl}${runtime.healthPath}`,
    };
  }

  const targetUrl = `${runtime.baseUrl}${runtime.healthPath}`;
  try {
    const directHealth = await executeSupportModuleHealthCheckFromDirect(targetUrl);
    if (directHealth.status === 'ONLINE' || directHealth.status === 'DEGRADED') {
      return directHealth;
    }

    const nexusHealth = await executeSupportModuleHealthCheckViaNexus(runtime);
    if (nexusHealth) {
      return nexusHealth;
    }

    return directHealth;
  } catch (error) {
    return {
      status: 'OFFLINE',
      checkedAt: moduleIsoNow(),
      message: error instanceof Error ? error.message : 'Falha no health-check.',
      targetUrl,
    };
  }
};

const requireActor = async (req: Request): Promise<{ uid: string; role: string; tenantId: string }> => {
  const uid = await requireUser(req);
  const profile = await requireUserProfile(uid);
  return {
    uid,
    role: profile.role,
    tenantId: profile.tenantId,
  };
};

async function handleMarketKernel(req: Request, res: Response, routePath: string) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
    res.status(204).send('');
    return;
  }

  if (req.method === 'GET' && routePath === '/v1/market/health') {
    send(res, 200, { data: await marketKernel.health() });
    return;
  }

  const actor = await requireActor(req);

  if (req.method === 'GET' && routePath === '/v1/support/modules') {
    assertModuleControlAccess(actor);
    send(res, 200, { data: await loadSupportModules(actor) });
    return;
  }

  if ((req.method === 'GET' || req.method === 'POST') && routePath === '/v1/support/modules/manifest') {
    assertModuleControlAccess(actor);
    const queryModuleKey =
      req.method === 'POST'
        ? (req.body as { moduleKey?: SupportModuleKey } | undefined)?.moduleKey
        : undefined;
    const requestedModuleKey = queryModuleKey
      ? normalizeSupportModuleKey(queryModuleKey)
      : (() => {
          const rawQuery = req.query?.moduleKey;
          if (!rawQuery) return null;
          if (Array.isArray(rawQuery)) {
            return rawQuery[0] ? normalizeSupportModuleKey(rawQuery[0]) : null;
          }
          if (typeof rawQuery === 'string' && rawQuery.trim()) {
            return normalizeSupportModuleKey(rawQuery);
          }
          return null;
        })();
    const modules = await loadSupportModules(actor);
    const targets = requestedModuleKey ? modules.filter((entry) => entry.moduleKey === requestedModuleKey) : modules;

    const manifests = await Promise.all(targets.map((entry) => resolveSupportModuleManifest(entry)));
    send(res, 200, { data: manifests });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/support/modules/upsert') {
    assertModuleControlAccess(actor);
    const moduleKey = normalizeSupportModuleKey((req.body as SupportModuleUpsertPayload | undefined)?.moduleKey);
    const currentModules = await loadSupportModules(actor);
    const current = currentModules.find((entry) => entry.moduleKey === moduleKey) ?? toSupportModuleRuntime(moduleKey, undefined);
    const nextRuntime = toSupportModuleRuntime(moduleKey, {
      ...current,
      ...(req.body ?? {}),
      lastConfiguredAt: moduleIsoNow(),
      lastConfiguredBy: actor.uid,
      lastHealthCheck: current.lastHealthCheck ?? null,
    });

    ensureSupportModuleRuntimeIsValid(nextRuntime);
    await persistSupportModuleRuntime(actor, nextRuntime);
    await auditService.append(actor, {
      eventType: 'MODULE_RUNTIME_UPSERTED',
      operationType: 'MODULE_RUNTIME_UPSERT',
      status: 'SUCCESS',
      stream: 'module-governance',
      payload: {
        moduleKey: nextRuntime.moduleKey,
        environment: nextRuntime.environment,
        authMode: nextRuntime.authMode,
        enabled: nextRuntime.enabled,
        capabilities: nextRuntime.capabilities,
      },
    });
    send(res, 200, { data: nextRuntime });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/support/modules/health') {
    assertModuleControlAccess(actor);
    const requestedModuleKey = (req.body as { moduleKey?: SupportModuleKey } | undefined)?.moduleKey;
    const targetModuleKey = requestedModuleKey ? normalizeSupportModuleKey(requestedModuleKey) : null;
    const modules = await loadSupportModules(actor);
    const targets = targetModuleKey ? modules.filter((entry) => entry.moduleKey === targetModuleKey) : modules;

    const checkedModules = await Promise.all(
      targets.map(async (entry) => {
        const lastHealthCheck = await executeSupportModuleHealthCheck(entry);
        const nextRuntime: SupportModuleRuntimePayload = {
          ...entry,
          lastHealthCheck,
        };
        await persistSupportModuleRuntime(actor, nextRuntime);
        return nextRuntime;
      })
    );

    await auditService.append(actor, {
      eventType: 'MODULE_RUNTIME_HEALTHCHECKED',
      operationType: 'MODULE_RUNTIME_HEALTHCHECK',
      status: 'SUCCESS',
      stream: 'module-governance',
      payload: {
        modules: checkedModules.map((entry) => ({
          moduleKey: entry.moduleKey,
          status: entry.lastHealthCheck?.status ?? 'UNCONFIGURED',
        })),
      },
    });

    send(res, 200, { data: checkedModules });
    return;
  }

  if (req.method === 'GET' && routePath === '/v1/support/nexus/signals') {
    assertModuleControlAccess(actor);
    const limit = normalizeNexusSignalsLimit(req.query?.limit);
    send(res, 200, { data: await loadNexusSignals(actor, limit) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/publish-listing') {
    send(res, 200, { data: await marketKernel.publishListing(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/update-listing-status') {
    send(res, 200, { data: await marketKernel.updateListingStatus(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/place-order') {
    send(res, 200, { data: await marketKernel.placeOrder(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/reserve-stock') {
    send(res, 200, { data: await marketKernel.reserveStock(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/sign-contract') {
    send(res, 200, { data: await marketKernel.signContract(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/create-escrow') {
    send(res, 200, { data: await marketKernel.createEscrow(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/confirm-dispatch') {
    send(res, 200, { data: await marketKernel.confirmDispatch(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/confirm-delivery') {
    send(res, 200, { data: await marketKernel.confirmDelivery(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/release-settlement') {
    send(res, 200, { data: await marketKernel.releaseSettlement(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/open-dispute') {
    send(res, 200, { data: await marketKernel.openDispute(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/resolve-dispute') {
    send(res, 200, { data: await marketKernel.resolveDispute(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/market/verify-audit-chain') {
    send(res, 200, { data: await marketKernel.verifyAuditChain(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/support/open-ticket') {
    send(res, 200, { data: await marketKernel.openSupportTicket(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/support/add-message') {
    send(res, 200, { data: await marketKernel.addSupportMessage(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/support/request-approval') {
    send(res, 200, { data: await marketKernel.requestSupportApproval(actor, req.body ?? {}) });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/support/decide-approval') {
    send(res, 200, { data: await marketKernel.decideSupportApproval(actor, req.body ?? {}) });
    return;
  }

  send(res, 404, { error: 'Endpoint de marketplace/suporte nao encontrado.' });
}

async function handleHttpApi(req: Request, res: Response, options?: { allowLegacyPrefix?: boolean }) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
    res.status(204).send('');
    return;
  }

  const routePath = options?.allowLegacyPrefix ? normalizeLegacyPath(req.path) : req.path;

  try {
    if (req.method === 'GET' && routePath === '/health') {
      send(res, 200, { status: 'ok' });
      return;
    }

    if (req.method === 'GET' && routePath === '/v1/support/manifest') {
      const runtime = toSupportModuleRuntime('ERP_CORE', undefined);
      send(res, 200, {
        data: {
          moduleKey: runtime.moduleKey,
          displayName: runtime.displayName,
          description: runtime.description,
          owningSystem: runtime.owningSystem,
          capabilities: runtime.capabilities,
          healthPath: runtime.healthPath,
          manifestPath: runtime.manifestPath,
          environment: runtime.environment,
          interfaces: {
            market: ['/v1/market/health', '/v1/market/release-settlement', '/v1/market/open-dispute'],
            support: [
              '/v1/support/open-ticket',
              '/v1/support/request-approval',
              '/v1/support/modules',
              '/v1/support/nexus/signals',
            ],
            integration: ['/v1/car/lookup', '/v1/ai/analyze'],
            public: ['/v1/public/market/summary', '/v1/public/market/prices'],
          },
          timestamp: moduleIsoNow(),
        },
      });
      return;
    }

    if (routePath.startsWith('/v1/public/market/')) {
      await handlePublicMarket(req, res, routePath);
      return;
    }

    if (req.method === 'POST' && routePath === '/v1/car/lookup') {
      await handleCarLookup(req, res);
      return;
    }

    if (req.method === 'POST' && routePath === '/v1/ai/analyze') {
      await handleAIAnalyze(req, res);
      return;
    }

    if (routePath.startsWith('/v1/market/') || routePath.startsWith('/v1/support/')) {
      await handleMarketKernel(req, res, routePath);
      return;
    }

    send(res, 404, { error: 'Endpoint nao encontrado.' });
  } catch (error) {
    handleHttpErrorResponse(req, res, routePath, options?.allowLegacyPrefix ? 'agroApi' : 'api', error);
  }
}

type MpvIngressRouteKey = 'SMARTPOS_WEBHOOK' | 'ASAAS_WEBHOOK' | 'ERP_FORWARD';
type MpvCoreAction =
  | 'PLACE_ORDER'
  | 'RESERVE_STOCK'
  | 'SIGN_CONTRACT'
  | 'CREATE_ESCROW'
  | 'CONFIRM_DISPATCH'
  | 'CONFIRM_DELIVERY'
  | 'RELEASE_SETTLEMENT';
type MpvIngressProcessingStatus = 'RECEIVED' | 'PROCESSED' | 'MANUAL_REVIEW_REQUIRED' | 'FAILED';
type MpvCoreExecution =
  | { mode: 'PROCESSED'; result: unknown }
  | { mode: 'MANUAL_REVIEW_REQUIRED'; reviewReason: string };

const mpvIngressCollection = (tenantId: string) =>
  db.collection('tenants').doc(tenantId).collection('mpvIngress');

const resolveMpvIngressSecret = (routeKey: MpvIngressRouteKey): string => {
  if (routeKey === 'SMARTPOS_WEBHOOK') {
    return String(MPV_CICLO_SMARTPOS_WEBHOOK_SECRET.value() ?? '').trim();
  }
  if (routeKey === 'ASAAS_WEBHOOK') {
    return String(MPV_CICLO_ASAAS_WEBHOOK_SECRET.value() ?? '').trim();
  }
  return String(MPV_CICLO_ERP_FORWARD_SECRET.value() ?? '').trim();
};

const readMpvRequestSecret = (req: Request): string => {
  const bearer = String(req.get('authorization') ?? '').trim();
  if (bearer.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim();
  }

  return String(req.get('x-mpv-secret') ?? '').trim();
};

const resolveMpvTenantId = (req: Request, payload: Record<string, unknown>): string => {
  const headerTenantId = String(req.get('x-tenant-id') ?? '').trim();
  if (headerTenantId) {
    return headerTenantId;
  }

  const payloadTenantId =
    typeof payload.tenantId === 'string'
      ? payload.tenantId
      : typeof payload.tenant === 'string'
        ? payload.tenant
        : typeof payload.tenant_id === 'string'
          ? payload.tenant_id
          : '';

  return String(payloadTenantId ?? '').trim();
};

const sanitizeMpvHeaders = (req: Request): Record<string, string> => {
  const safeHeaders = [
    'content-type',
    'user-agent',
    'x-request-id',
    'x-tenant-id',
    'x-asaas-event',
    'x-smartpos-device',
    'x-smartpos-event',
    'x-erp-operation',
  ];
  return safeHeaders.reduce<Record<string, string>>((acc, key) => {
    const value = req.get(key);
    if (value) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const persistMpvIngressEvent = async (
  req: Request,
  routeKey: MpvIngressRouteKey,
  tenantId: string,
  payload: Record<string, unknown>
): Promise<string> => {
  const docRef = mpvIngressCollection(tenantId).doc();
  const payloadJson = JSON.stringify(payload);
  const payloadHash = createHash('sha256').update(payloadJson).digest('hex');
  const correlationId = String(req.get('x-request-id') ?? docRef.id).trim() || docRef.id;
  const routePath = req.path.length > 1 && req.path.endsWith('/') ? req.path.slice(0, -1) : req.path;

  await docRef.set({
    id: docRef.id,
    moduleKey: 'MPV_CICLO',
    tenantId,
    routeKey,
    routePath,
    correlationId,
    processingStatus: 'RECEIVED',
    processingMode: 'ASYNC_PENDING',
    payload,
    payloadHash,
    headers: sanitizeMpvHeaders(req),
    receivedAtIso: moduleIsoNow(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await auditService.append(
    {
      uid: 'system:mpv_ciclo',
      role: 'Integradora',
      tenantId,
    },
    {
      eventType: `MPV_${routeKey}_RECEIVED`,
      operationType: 'MPV_INGRESS',
      status: 'SUCCESS',
      stream: 'mpv-ingress',
      payload: {
        routeKey,
        routePath,
        correlationId,
        ingressId: docRef.id,
        payloadHash,
      },
    }
  );

  return docRef.id;
};

const updateMpvIngressEvent = async (
  tenantId: string,
  ingressId: string,
  patch: Record<string, unknown>
): Promise<void> => {
  await mpvIngressCollection(tenantId).doc(ingressId).set(
    {
      ...patch,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

const buildMpvSystemActor = (tenantId: string, role = 'MANAGER') => ({
  uid: 'system:mpv_ciclo',
  role,
  tenantId,
});

const normalizeMpvToken = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();

const firstNonEmptyString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const firstPositiveNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }
  return null;
};

const compactRecord = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));

const asArrayOfRecords = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map((item) => asRecord(item)).filter(Boolean) as Record<string, unknown>[] : [];

const resolveMpvCoreActionAlias = (value: unknown): MpvCoreAction | null => {
  const token = normalizeMpvToken(value);
  if (!token) {
    return null;
  }

  if (
    [
      'PLACE_ORDER',
      'ORDER_PLACE',
      'ORDER_CREATED',
      'ORDER_PLACED',
      'SALE_CREATED',
      'SMARTPOS_SALE_CREATED',
      'CHECKOUT_COMPLETED',
    ].includes(token)
  ) {
    return 'PLACE_ORDER';
  }

  if (['RESERVE_STOCK', 'STOCK_RESERVED', 'INVENTORY_RESERVED', 'ORDER_RESERVED'].includes(token)) {
    return 'RESERVE_STOCK';
  }

  if (['SIGN_CONTRACT', 'CONTRACT_SIGN', 'CONTRACT_SIGNED'].includes(token)) {
    return 'SIGN_CONTRACT';
  }

  if (
    [
      'CREATE_ESCROW',
      'ESCROW_CREATE',
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'PAYMENT_SETTLED',
      'PAYMENT_AUTHORIZED',
    ].includes(token)
  ) {
    return 'CREATE_ESCROW';
  }

  if (
    ['CONFIRM_DISPATCH', 'DISPATCH_CONFIRMED', 'SHIPMENT_DISPATCHED', 'ORDER_DISPATCHED'].includes(token)
  ) {
    return 'CONFIRM_DISPATCH';
  }

  if (
    ['CONFIRM_DELIVERY', 'DELIVERY_CONFIRMED', 'ORDER_DELIVERED', 'PAYMENT_DELIVERED'].includes(token)
  ) {
    return 'CONFIRM_DELIVERY';
  }

  if (['RELEASE_SETTLEMENT', 'SETTLEMENT_RELEASE', 'SPLIT_RELEASED'].includes(token)) {
    return 'RELEASE_SETTLEMENT';
  }

  return null;
};

const resolveMpvCoreAction = (
  req: Request,
  routeKey: MpvIngressRouteKey,
  payload: Record<string, unknown>
): MpvCoreAction | null => {
  const command = asRecord(payload.command) ?? {};
  const payment = asRecord(payload.payment) ?? {};

  const explicitCandidates = [
    payload.coreAction,
    payload.operation,
    payload.action,
    payload.workflow,
    payload.targetAction,
    payload.route,
    command.action,
    command.operation,
    command.route,
  ];

  for (const candidate of explicitCandidates) {
    const resolved = resolveMpvCoreActionAlias(candidate);
    if (resolved) {
      return resolved;
    }
  }

  const eventCandidates = [
    req.get('x-asaas-event'),
    req.get('x-smartpos-event'),
    req.get('x-erp-operation'),
    payload.event,
    payload.type,
    payload.status,
    payment.event,
    payment.status,
  ];

  for (const candidate of eventCandidates) {
    const resolved = resolveMpvCoreActionAlias(candidate);
    if (resolved) {
      return resolved;
    }
  }

  if (routeKey === 'ASAAS_WEBHOOK') {
    const asaasEvent = normalizeMpvToken(req.get('x-asaas-event') ?? payload.event ?? payment.event);
    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_SETTLED'].includes(asaasEvent)) {
      return 'CREATE_ESCROW';
    }
  }

  return null;
};

const resolveMpvKernelPayload = (
  req: Request,
  routeKey: MpvIngressRouteKey,
  action: MpvCoreAction,
  payload: Record<string, unknown>
): { actorRole: string; kernelPayload?: Record<string, unknown>; reviewReason?: string } => {
  const payment = asRecord(payload.payment) ?? {};
  const order = asRecord(payload.order) ?? {};
  const listing = asRecord(payload.listing) ?? {};
  const product = asRecord(payload.product) ?? {};
  const contract = asRecord(payload.contract) ?? {};
  const telemetry = asRecord(payload.telemetry) ?? {};
  const items = asArrayOfRecords(payload.items);
  const firstItem = items[0] ?? asRecord(payload.item) ?? {};

  const orderId = firstNonEmptyString(
    payload.orderId,
    order.orderId,
    order.id,
    payload.externalReference,
    payment.externalReference
  );
  const supplierOrderId = firstNonEmptyString(payload.supplierOrderId, order.supplierOrderId);
  const settlementId = firstNonEmptyString(payload.settlementId, order.settlementId);
  const amount = firstPositiveNumber(payload.amount, payload.totalAmount, payment.value);

  if (action === 'PLACE_ORDER') {
    const listingId = firstNonEmptyString(payload.listingId, listing.id, firstItem.listingId, product.listingId);
    const productName = firstNonEmptyString(
      listing.productName,
      listing.name,
      firstItem.productName,
      firstItem.name,
      product.productName,
      product.name,
      payload.productName,
      payload.description,
      payload.title
    );
    const quantity = firstPositiveNumber(payload.quantity, firstItem.quantity, order.quantity, 1) ?? 1;
    const unitPrice = firstPositiveNumber(
      payload.unitPrice,
      listing.unitPrice,
      listing.price,
      firstItem.unitPrice,
      firstItem.price,
      product.unitPrice,
      product.price,
      payload.amount,
      payment.value
    );

    if (!listingId && !productName) {
      return {
        actorRole: 'MANAGER',
        reviewReason: 'Evento sem listingId ou descricao de item para criacao canonica de pedido.',
      };
    }

    if (!listingId && unitPrice === null) {
      return {
        actorRole: 'MANAGER',
        reviewReason: 'Evento sem unitPrice para criacao automatica de pedido no Ciclo.',
      };
    }

    const generatedListing =
      listingId
        ? undefined
        : {
            productName,
            price: unitPrice,
            unitPrice,
            availableQuantity:
              firstPositiveNumber(listing.availableQuantity, listing.stock, firstItem.availableQuantity, quantity) ??
              quantity,
            supplierName: firstNonEmptyString(
              listing.supplierName,
              firstItem.supplierName,
              product.supplierName,
              payload.supplierName,
              'Fornecedor'
            ),
            listingCategory: firstNonEmptyString(payload.listingCategory, listing.listingCategory, 'OUTPUTS_PRODUCER'),
            listingMode: firstNonEmptyString(payload.listingMode, listing.listingMode, 'FIXED_PRICE'),
          };

    return {
      actorRole: 'MANAGER',
      kernelPayload: compactRecord({
        listingId: listingId || undefined,
        listing: generatedListing ? compactRecord(generatedListing) : undefined,
        quantity,
        unitPrice: unitPrice ?? undefined,
        paymentMethod: firstNonEmptyString(payload.paymentMethod, payment.billingType, payload.billingType, 'pix'),
        channel:
          routeKey === 'SMARTPOS_WEBHOOK'
            ? 'RETAIL_MARKETS'
            : firstNonEmptyString(payload.channel) || undefined,
        domain:
          routeKey === 'SMARTPOS_WEBHOOK'
            ? 'CONSUMER_MARKET'
            : firstNonEmptyString(payload.domain) || undefined,
        transactionId: firstNonEmptyString(payload.transactionId, payment.id, payload.id, order.transactionId) || undefined,
      }),
    };
  }

  if (!orderId && !supplierOrderId) {
    return {
      actorRole: 'MANAGER',
      reviewReason: 'Evento sem orderId ou supplierOrderId para reconciliacao canonica.',
    };
  }

  if (action === 'RESERVE_STOCK') {
    return {
      actorRole: 'MANAGER',
      kernelPayload: compactRecord({
        orderId: orderId || undefined,
        supplierOrderId: supplierOrderId || undefined,
      }),
    };
  }

  if (action === 'SIGN_CONTRACT') {
    const evidences = Array.isArray(payload.evidences) ? payload.evidences : [];
    const contractUrl = firstNonEmptyString(payload.contractUrl, contract.contractUrl, contract.url);
    if (!contractUrl && evidences.length === 0) {
      return {
        actorRole: 'MANAGER',
        reviewReason: 'Assinatura de contrato exige contractUrl ou evidencias compatíveis.',
      };
    }

    return {
      actorRole: 'MANAGER',
      kernelPayload: compactRecord({
        orderId: orderId || undefined,
        supplierOrderId: supplierOrderId || undefined,
        contractTerms: firstNonEmptyString(payload.contractTerms, contract.terms) || undefined,
        contractUrl: contractUrl || undefined,
        evidences,
      }),
    };
  }

  if (action === 'CREATE_ESCROW') {
    return {
      actorRole: 'MANAGER',
      kernelPayload: compactRecord({
        orderId: orderId || undefined,
        supplierOrderId: supplierOrderId || undefined,
        amount: amount ?? undefined,
        contractTerms: firstNonEmptyString(payload.contractTerms, contract.terms) || undefined,
        contractUrl: firstNonEmptyString(payload.contractUrl, contract.contractUrl, contract.url) || undefined,
        evidences: Array.isArray(payload.evidences) ? payload.evidences : undefined,
      }),
    };
  }

  if (action === 'CONFIRM_DISPATCH') {
    const telemetryPayload =
      Object.keys(telemetry).length > 0
        ? telemetry
        : {
            source: routeKey,
            capturedAt: moduleIsoNow(),
            event: firstNonEmptyString(req.get('x-smartpos-event'), payload.event, payload.type) || undefined,
            device: firstNonEmptyString(req.get('x-smartpos-device')) || undefined,
          };

    return {
      actorRole: 'MANAGER',
      kernelPayload: compactRecord({
        orderId: orderId || undefined,
        supplierOrderId: supplierOrderId || undefined,
        telemetry: telemetryPayload,
      }),
    };
  }

  if (action === 'CONFIRM_DELIVERY') {
    const evidences = Array.isArray(payload.evidences) ? payload.evidences : [];
    if (evidences.length === 0) {
      return {
        actorRole: 'MANAGER',
        reviewReason: 'Confirmacao de entrega exige evidencias compatíveis com a politica do núcleo.',
      };
    }

    return {
      actorRole: 'MANAGER',
      kernelPayload: compactRecord({
        orderId: orderId || undefined,
        supplierOrderId: supplierOrderId || undefined,
        evidences,
        requireDocumentTypeB: Boolean(payload.requireDocumentTypeB),
      }),
    };
  }

  return {
    actorRole: 'MANAGER',
    kernelPayload: compactRecord({
      orderId: orderId || undefined,
      supplierOrderId: supplierOrderId || undefined,
      settlementId: settlementId || undefined,
      amount: amount ?? undefined,
    }),
  };
};

const resolveMpvOrderForCoreFlow = async (
  tenantId: string,
  kernelPayload: Record<string, unknown>
): Promise<{ id: string; data: Record<string, unknown> }> => {
  const orderId = firstNonEmptyString(kernelPayload.orderId);
  if (orderId) {
    const snapshot = await db.collection('tenants').doc(tenantId).collection('marketOrders').doc(orderId).get();
    if (!snapshot.exists) {
      throw new Error(`Pedido ${orderId} nao encontrado no tenant ${tenantId}.`);
    }
    return {
      id: snapshot.id,
      data: (snapshot.data() as Record<string, unknown> | undefined) ?? {},
    };
  }

  const supplierOrderId = firstNonEmptyString(kernelPayload.supplierOrderId);
  if (supplierOrderId) {
    const snapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('marketOrders')
      .where('supplierOrderId', '==', supplierOrderId)
      .limit(1)
      .get();
    if (snapshot.empty) {
      throw new Error(`Pedido supplierOrderId=${supplierOrderId} nao encontrado no tenant ${tenantId}.`);
    }
    const docSnapshot = snapshot.docs[0];
    return {
      id: docSnapshot.id,
      data: (docSnapshot.data() as Record<string, unknown> | undefined) ?? {},
    };
  }

  throw new Error('Despacho MPV sem orderId ou supplierOrderId para localizar o pedido canonico.');
};

const executeMpvEscrowFlow = async (
  tenantId: string,
  actorRole: string,
  kernelPayload: Record<string, unknown>
): Promise<MpvCoreExecution> => {
  const actor = buildMpvSystemActor(tenantId, actorRole);
  const order = await resolveMpvOrderForCoreFlow(tenantId, kernelPayload);
  const orderStatus = String(order.data.status ?? 'CREATED');
  const supplierOrderId = firstNonEmptyString(order.data.supplierOrderId, kernelPayload.supplierOrderId);
  const orderIdentity = compactRecord({
    orderId: order.id,
    supplierOrderId: supplierOrderId || undefined,
  });

  let contractResult: unknown = null;
  if (orderStatus === 'RESERVED') {
    const contractUrl = firstNonEmptyString(kernelPayload.contractUrl);
    const evidences = Array.isArray(kernelPayload.evidences) ? kernelPayload.evidences : [];
    if (!contractUrl && evidences.length === 0) {
      return {
        mode: 'MANUAL_REVIEW_REQUIRED',
        reviewReason:
          'Pagamento confirmado com pedido RESERVED, mas sem contractUrl ou evidencias para assinatura canonica.',
      };
    }

    contractResult = await marketKernel.signContract(
      actor,
      compactRecord({
        ...orderIdentity,
        contractTerms: firstNonEmptyString(kernelPayload.contractTerms, 'Contrato originado pelo MPV Ciclo') || undefined,
        contractUrl: contractUrl || undefined,
        evidences: evidences.length > 0 ? evidences : undefined,
      })
    );
  } else if (orderStatus !== 'CONTRACT_PENDING') {
    return {
      mode: 'MANUAL_REVIEW_REQUIRED',
      reviewReason: `Pedido em estado ${orderStatus}; escrow automatico exige CONTRACT_PENDING ou RESERVED com contrato valido.`,
    };
  }

  const escrowResult = await marketKernel.createEscrow(
    actor,
    compactRecord({
      ...orderIdentity,
      amount: firstPositiveNumber(kernelPayload.amount) ?? undefined,
    })
  );

  return {
    mode: 'PROCESSED',
    result: compactRecord({
      executedActions: contractResult ? ['SIGN_CONTRACT', 'CREATE_ESCROW'] : ['CREATE_ESCROW'],
      contractResult: contractResult || undefined,
      escrowResult,
    }),
  };
};

const executeMpvCoreAction = async (
  tenantId: string,
  action: MpvCoreAction,
  actorRole: string,
  kernelPayload: Record<string, unknown>
) : Promise<MpvCoreExecution> => {
  const actor = buildMpvSystemActor(tenantId, actorRole);
  if (action === 'PLACE_ORDER') {
    return { mode: 'PROCESSED', result: await marketKernel.placeOrder(actor, kernelPayload) };
  }
  if (action === 'RESERVE_STOCK') {
    return { mode: 'PROCESSED', result: await marketKernel.reserveStock(actor, kernelPayload) };
  }
  if (action === 'SIGN_CONTRACT') {
    return { mode: 'PROCESSED', result: await marketKernel.signContract(actor, kernelPayload) };
  }
  if (action === 'CREATE_ESCROW') {
    return executeMpvEscrowFlow(tenantId, actorRole, kernelPayload);
  }
  if (action === 'CONFIRM_DISPATCH') {
    return { mode: 'PROCESSED', result: await marketKernel.confirmDispatch(actor, kernelPayload) };
  }
  if (action === 'CONFIRM_DELIVERY') {
    return { mode: 'PROCESSED', result: await marketKernel.confirmDelivery(actor, kernelPayload) };
  }
  return { mode: 'PROCESSED', result: await marketKernel.releaseSettlement(actor, kernelPayload) };
};

const appendMpvProcessingAudit = async (
  tenantId: string,
  eventType: string,
  status: 'SUCCESS' | 'REJECTED',
  payload: Record<string, unknown>
): Promise<void> => {
  await auditService.append(
    {
      uid: 'system:mpv_ciclo',
      role: 'Integradora',
      tenantId,
    },
    {
      eventType,
      operationType: 'MPV_CORE_DISPATCH',
      status,
      stream: 'mpv-ingress',
      payload,
    }
  );
};

const processMpvIngressEvent = async (
  req: Request,
  routeKey: MpvIngressRouteKey,
  tenantId: string,
  ingressId: string,
  payload: Record<string, unknown>
): Promise<{
  processingStatus: MpvIngressProcessingStatus;
  coreAction?: MpvCoreAction;
  coreResult?: unknown;
  reviewReason?: string;
  failureMessage?: string;
}> => {
  const coreAction = resolveMpvCoreAction(req, routeKey, payload);
  if (!coreAction) {
    const reviewReason = 'Evento recebido sem mapeamento canonico seguro para o núcleo do Projeto Ciclo.';
    await updateMpvIngressEvent(tenantId, ingressId, {
      processingStatus: 'MANUAL_REVIEW_REQUIRED',
      processingMode: 'SYNC_TO_CORE',
      reviewReason,
      processedAtIso: moduleIsoNow(),
    });
    await appendMpvProcessingAudit(tenantId, 'MPV_CORE_ACTION_REVIEW_REQUIRED', 'REJECTED', {
      ingressId,
      routeKey,
      reviewReason,
    });
    return {
      processingStatus: 'MANUAL_REVIEW_REQUIRED',
      reviewReason,
    };
  }

  const dispatchPlan = resolveMpvKernelPayload(req, routeKey, coreAction, payload);
  if (!dispatchPlan.kernelPayload) {
    const reviewReason =
      dispatchPlan.reviewReason ?? 'Evento exige enriquecimento adicional antes do despacho ao núcleo.';
    await updateMpvIngressEvent(tenantId, ingressId, {
      processingStatus: 'MANUAL_REVIEW_REQUIRED',
      processingMode: 'SYNC_TO_CORE',
      coreAction,
      reviewReason,
      processedAtIso: moduleIsoNow(),
    });
    await appendMpvProcessingAudit(tenantId, 'MPV_CORE_ACTION_REVIEW_REQUIRED', 'REJECTED', {
      ingressId,
      routeKey,
      coreAction,
      reviewReason,
    });
    return {
      processingStatus: 'MANUAL_REVIEW_REQUIRED',
      coreAction,
      reviewReason,
    };
  }

  try {
    const execution = await executeMpvCoreAction(
      tenantId,
      coreAction,
      dispatchPlan.actorRole,
      dispatchPlan.kernelPayload
    );
    if (execution.mode === 'MANUAL_REVIEW_REQUIRED') {
      await updateMpvIngressEvent(tenantId, ingressId, {
        processingStatus: 'MANUAL_REVIEW_REQUIRED',
        processingMode: 'SYNC_TO_CORE',
        coreAction,
        reviewReason: execution.reviewReason,
        processedAtIso: moduleIsoNow(),
      });
      await appendMpvProcessingAudit(tenantId, 'MPV_CORE_ACTION_REVIEW_REQUIRED', 'REJECTED', {
        ingressId,
        routeKey,
        coreAction,
        reviewReason: execution.reviewReason,
      });
      return {
        processingStatus: 'MANUAL_REVIEW_REQUIRED',
        coreAction,
        reviewReason: execution.reviewReason,
      };
    }
    const coreResult = execution.result;
    await updateMpvIngressEvent(tenantId, ingressId, {
      processingStatus: 'PROCESSED',
      processingMode: 'SYNC_TO_CORE',
      coreAction,
      coreResult,
      processedAtIso: moduleIsoNow(),
    });
    await appendMpvProcessingAudit(tenantId, 'MPV_CORE_ACTION_PROCESSED', 'SUCCESS', {
      ingressId,
      routeKey,
      coreAction,
    });
    return {
      processingStatus: 'PROCESSED',
      coreAction,
      coreResult,
    };
  } catch (error) {
    const failureMessage = error instanceof Error ? error.message : 'Falha no despacho interno do MPV Ciclo.';
    await updateMpvIngressEvent(tenantId, ingressId, {
      processingStatus: 'FAILED',
      processingMode: 'SYNC_TO_CORE',
      coreAction,
      failureMessage,
      processedAtIso: moduleIsoNow(),
    });
    await appendMpvProcessingAudit(tenantId, 'MPV_CORE_ACTION_FAILED', 'REJECTED', {
      ingressId,
      routeKey,
      coreAction,
      failureMessage,
    });
    return {
      processingStatus: 'FAILED',
      coreAction,
      failureMessage,
    };
  }
};

const acceptMpvIngress = async (
  req: Request,
  res: Response,
  routeKey: MpvIngressRouteKey
): Promise<void> => {
  const configuredSecret = resolveMpvIngressSecret(routeKey);
  if (!configuredSecret) {
    send(res, 503, {
      error: `Endpoint ${routeKey} desabilitado ate configuracao segura do segredo compartilhado.`,
    });
    return;
  }

  const requestSecret = readMpvRequestSecret(req);
  if (!requestSecret || requestSecret !== configuredSecret) {
    send(res, 401, { error: 'Segredo compartilhado invalido para MPV Ciclo.' });
    return;
  }

  const payload = asRecord(req.body) ?? {};
  const tenantId = resolveMpvTenantId(req, payload);
  if (!tenantId) {
    send(res, 400, { error: 'tenantId obrigatorio via x-tenant-id ou payload.' });
    return;
  }

  const ingressId = await persistMpvIngressEvent(req, routeKey, tenantId, payload);
  const processing = await processMpvIngressEvent(req, routeKey, tenantId, ingressId, payload);
  send(res, 202, {
    data: {
      ingressId,
      tenantId,
      routeKey,
      status: processing.processingStatus,
      coreAction: processing.coreAction ?? null,
      reviewReason: processing.reviewReason ?? null,
      failureMessage: processing.failureMessage ?? null,
      coreResult: processing.coreResult ?? null,
    },
  });
};

async function handleMpvCicloApi(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
    res.status(204).send('');
    return;
  }

  const routePath = req.path.length > 1 && req.path.endsWith('/') ? req.path.slice(0, -1) : req.path;
  const environment = String(process.env.SUPPORT_MODULE_MPV_CICLO_ENVIRONMENT ?? 'PRODUCAO').trim() || 'PRODUCAO';

  try {
    if (req.method === 'GET' && (routePath === '/' || routePath === '/healthz')) {
      send(res, 200, {
        moduleKey: 'MPV_CICLO',
        status: 'ONLINE',
        checkedAt: moduleIsoNow(),
        message: 'MPV Ciclo online com borda segura e despacho canonico ao núcleo.',
        service: 'mpvCicloApi',
        runtimeMode: 'INGRESS_ROUTED',
        acceptingTransactions: true,
        acceptingIngress: true,
        secureIngressConfigured: Boolean(
          resolveMpvIngressSecret('SMARTPOS_WEBHOOK') &&
            resolveMpvIngressSecret('ASAAS_WEBHOOK') &&
            resolveMpvIngressSecret('ERP_FORWARD')
        ),
        environment,
      });
      return;
    }

    if (req.method === 'POST' && routePath === '/v1/webhooks/smartpos') {
      await acceptMpvIngress(req, res, 'SMARTPOS_WEBHOOK');
      return;
    }

    if (req.method === 'POST' && routePath === '/v1/webhooks/asaas') {
      await acceptMpvIngress(req, res, 'ASAAS_WEBHOOK');
      return;
    }

    if (req.method === 'POST' && routePath === '/v1/erp/forward') {
      await acceptMpvIngress(req, res, 'ERP_FORWARD');
      return;
    }

    if (req.method === 'GET' && routePath === '/manifest') {
      send(res, 200, {
        data: {
          moduleKey: 'MPV_CICLO',
          displayName: 'MPV Ciclo',
          description: 'Gateway seguro ERP + PDV + pagamentos com despacho canonico para o núcleo do Projeto Ciclo.',
          owningSystem: 'Projeto Ciclo',
          capabilities: ['smartpos-webhook', 'pricing-lock', 'erp-forwarding', 'scheduler-retry'],
          healthPath: '/healthz',
          manifestPath: '/manifest',
          environment,
          runtimeMode: 'INGRESS_ROUTED',
          acceptingTransactions: true,
          acceptingIngress: true,
          secureIngressConfigured: Boolean(
            resolveMpvIngressSecret('SMARTPOS_WEBHOOK') &&
              resolveMpvIngressSecret('ASAAS_WEBHOOK') &&
              resolveMpvIngressSecret('ERP_FORWARD')
          ),
          interfaces: {
            implemented: ['/healthz', '/manifest', '/v1/webhooks/smartpos', '/v1/webhooks/asaas', '/v1/erp/forward'],
            secured: ['/v1/webhooks/smartpos', '/v1/webhooks/asaas', '/v1/erp/forward'],
            planned: ['/v1/pricing/lock', '/v1/scheduler/retry'],
          },
          timestamp: moduleIsoNow(),
        },
      });
      return;
    }

    send(res, 404, { error: 'Endpoint MPV Ciclo nao encontrado.' });
  } catch (error) {
    handleHttpErrorResponse(req, res, routePath || '/', 'mpvCicloApi', error);
  }
}

const normalizeDirectPath = (path: string, prefix: '/v1/market' | '/v1/support'): string => {
  if (path.startsWith('/v1/')) {
    return path;
  }

  if (path === '/' || path.length === 0) {
    return prefix === '/v1/market' ? '/v1/market/health' : '/v1/support/open-ticket';
  }

  return `${prefix}${path.startsWith('/') ? path : `/${path}`}`;
};

export const api = onRequest({ region: 'us-central1' }, async (req: Request, res: Response) => {
  await handleHttpApi(req, res);
});

export const marketApi = onRequest({ region: 'us-central1' }, async (req: Request, res: Response) => {
  try {
    const routePath = normalizeDirectPath(req.path, '/v1/market');
    await handleMarketKernel(req, res, routePath);
  } catch (error) {
    const routePath = normalizeDirectPath(req.path, '/v1/market');
    handleHttpErrorResponse(req, res, routePath, 'marketApi', error);
  }
});

export const supportApi = onRequest({ region: 'us-central1' }, async (req: Request, res: Response) => {
  try {
    const routePath = normalizeDirectPath(req.path, '/v1/support');
    await handleMarketKernel(req, res, routePath);
  } catch (error) {
    const routePath = normalizeDirectPath(req.path, '/v1/support');
    handleHttpErrorResponse(req, res, routePath, 'supportApi', error);
  }
});

export const mpvCicloApi = onRequest(
  {
    region: 'us-central1',
    secrets: [
      MPV_CICLO_SMARTPOS_WEBHOOK_SECRET,
      MPV_CICLO_ASAAS_WEBHOOK_SECRET,
      MPV_CICLO_ERP_FORWARD_SECRET,
    ],
  },
  async (req: Request, res: Response) => {
    await handleMpvCicloApi(req, res);
  }
);

export const agroApi = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    maxInstances: 20,
    memory: '512MiB',
  },
  async (req: Request, res: Response) => {
    await handleHttpApi(req, res, { allowLegacyPrefix: true });
  }
);

export const adminUpsertPublicMarketPoint = onCall(
  {
    region: 'southamerica-east1',
    timeoutSeconds: 60,
    maxInstances: 20,
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (request: CallableRequest<AdminUpsertPublicMarketPointPayload>) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Usuario nao autenticado.');
    }

    const callerToken = request.auth?.token as Record<string, unknown> | undefined;
    let isAdmin = callerHasAdminClaim(callerToken);
    if (!isAdmin) {
      const callerProfile = await requireUserProfile(callerUid);
      isAdmin = callerProfile.role === 'Administrador';
    }

    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Somente ADMIN pode inserir pontos de mercado publico.');
    }

    const symbol = String(request.data?.symbol ?? '')
      .trim()
      .replace(/\s+/g, '_')
      .toUpperCase();
    if (!symbol) {
      throw new HttpsError('invalid-argument', 'symbol obrigatorio.');
    }

    const category = normalizePublicCategory(request.data?.category ?? '');
    const dateKey = normalizeDateKey(request.data?.date);
    const price = numeric(request.data?.price, Number.NaN);
    if (!Number.isFinite(price) || price <= 0) {
      throw new HttpsError('invalid-argument', 'price deve ser maior que zero.');
    }

    const name = String(request.data?.name ?? symbol).trim();
    const unit = String(request.data?.unit ?? '').trim();
    const currency = String(request.data?.currency ?? 'BRL').trim().toUpperCase() || 'BRL';
    const source = String(request.data?.source ?? 'ADMIN_MANUAL').trim();
    const sourceRef = String(request.data?.sourceRef ?? '').trim();
    const region = String(request.data?.region ?? '').trim();

    const changes = await computePriceChanges(symbol, price, dateKey);
    const nowIso = new Date().toISOString();

    await db.runTransaction(async (tx) => {
      const listingRef = db.collection('publicMarketPrices').doc(symbol);
      tx.set(
        listingRef,
        {
          symbol,
          category,
          name,
          unit,
          currency,
          price,
          change1d: changes.change1d,
          change7d: changes.change7d,
          change30d: changes.change30d,
          source,
          sourceRef: sourceRef || null,
          region: region || null,
          updatedAt: FieldValue.serverTimestamp(),
          updatedAtIso: nowIso,
        },
        { merge: true }
      );

      const pointRef = listingRef.collection('points').doc(dateKey);
      tx.set(
        pointRef,
        {
          symbol,
          category,
          date: dateKey,
          price,
          source,
          sourceRef: sourceRef || null,
          collectedAt: FieldValue.serverTimestamp(),
          collectedAtIso: nowIso,
        },
        { merge: true }
      );
    });

    const inputCostIndex = await recomputeInputCostIndex();

    return {
      ok: true,
      symbol,
      category,
      date: dateKey,
      price,
      inputCostIndex,
    };
  }
);

export const recomputePublicInputCostIndexDaily = onSchedule(
  {
    region: 'us-central1',
    schedule: 'every day 03:10',
    timeZone: 'America/Sao_Paulo',
  },
  async () => {
    await recomputeInputCostIndex();
  }
);

export const nexusObserveAuditLog = onDocumentCreated(
  {
    region: 'us-central1',
    document: 'tenants/{tenantId}/auditLogs/{auditId}',
    maxInstances: 20,
    retry: false,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const tenantId = String(event.params.tenantId ?? '').trim();
    const auditId = String(event.params.auditId ?? snapshot.id).trim();
    if (!tenantId || !auditId) {
      return;
    }

    const raw = asRecord(snapshot.data());
    if (!raw) {
      return;
    }

    const audit = toTenantAuditLogPayload(tenantId, auditId, raw);
    const signal = buildNexusSignalFromAudit(audit);
    await persistNexusSignal(signal);
  }
);

export const supportModulesHealthHeartbeat = onSchedule(
  {
    region: 'us-central1',
    schedule: 'every 5 minutes',
    timeZone: 'America/Sao_Paulo',
    maxInstances: 1,
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async () => {
    const modules = SUPPORT_MODULE_KEYS.map((moduleKey) => toSupportModuleRuntime(moduleKey, undefined));
    const targets = modules.filter((entry) => entry.enabled && entry.baseUrl);
    const now = moduleIsoNow();

    const checks = await Promise.all(
      targets.map(async (entry) => {
        const lastHealthCheck = await executeSupportModuleHealthCheck(entry);
        return {
          moduleKey: entry.moduleKey,
          status: lastHealthCheck.status,
          message: lastHealthCheck.message,
          targetUrl: lastHealthCheck.targetUrl,
          latencyMs: lastHealthCheck.latencyMs ?? null,
          httpStatus: lastHealthCheck.httpStatus ?? null,
          checkedAt: lastHealthCheck.checkedAt,
          timestamp: now,
        };
      })
    );

    await db.collection('monitoring').doc('supportModules').collection('heartbeat').add({
      runAt: now,
      totalMonitored: checks.length,
      checks,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
);

export const refreshPublicExternalMarketData = onSchedule(
  {
    region: 'us-central1',
    schedule: 'every 3 hours',
    timeZone: 'America/Sao_Paulo',
  },
  async () => {
    const [benchmarkPayload, newsPayload] = await Promise.all([
      buildExternalMarketBenchmarkPayload(),
      buildExternalNewsDigestPayload(),
    ]);

    const climateRegions = Object.keys(PUBLIC_CLIMATE_REGIONS).map((key) => normalizeClimateRegion(key));
    const climatePayloads = await Promise.all(
      climateRegions.map(async (region) => ({
        region,
        payload: await buildPublicClimateForecastPayload(region),
      }))
    );

    await Promise.all([
      writeExternalCache(EXTERNAL_BENCHMARK_CACHE_DOC, benchmarkPayload),
      writeExternalCache(EXTERNAL_NEWS_CACHE_DOC, newsPayload),
      ...climatePayloads.map((entry) => writeExternalCache(climateCacheDocId(entry.region), entry.payload)),
    ]);
  }
);

export const adminSetUserClaims = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    maxInstances: 10,
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (request: CallableRequest<AdminSetUserClaimsPayload>) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Usuario nao autenticado.');
    }

    const callerToken = request.auth?.token as Record<string, unknown> | undefined;
    let isAdmin = callerHasAdminClaim(callerToken);

    // Transitional fallback for one release while admin claims are being propagated.
    if (!isAdmin) {
      const callerProfile = await requireUserProfile(callerUid);
      isAdmin = callerProfile.role === 'Administrador';
    }

    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Somente ADMIN pode alterar custom claims.');
    }

    const uid = String(request.data?.uid ?? '').trim();
    const tenantId = String(request.data?.tenantId ?? '').trim();
    const role = normalizeRoleClaimInput(request.data?.role ?? 'PRODUCER');

    if (!uid) {
      throw new HttpsError('invalid-argument', 'uid obrigatorio.');
    }

    if (!tenantId) {
      throw new HttpsError('invalid-argument', 'tenantId obrigatorio.');
    }

    if (!role) {
      throw new HttpsError('invalid-argument', 'role invalido para custom claims.');
    }

    const producerScopes = role === 'PRODUCER' ? normalizeProducerScopesClaim(request.data?.producerScopes) : {};
    const claimsPayload = {
      role,
      tenantId,
      producerScopes,
    };

    await adminAuth.setCustomUserClaims(uid, claimsPayload);
    await db.collection('users').doc(uid).set(
      {
        role: PROFILE_ROLE_FROM_CLAIMS[role] ?? 'Produtor',
        tenantId,
        producerScopes,
        claimsUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      ok: true,
      uid,
      claims: claimsPayload,
    };
  }
);

export const secureConfirmInboundEntry = onCall(
  {
    region: 'southamerica-east1',
    timeoutSeconds: 60,
    maxInstances: 20,
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (request: CallableRequest<{ movementId?: string; invoiceNumber?: string }>) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Usuario nao autenticado.');
    }

    const profile = await requireRole(uid);
    const movementId = String(request.data?.movementId ?? '');
    const invoiceNumber = String(request.data?.invoiceNumber ?? '').trim();
    if (!movementId || !invoiceNumber) {
      throw new HttpsError('invalid-argument', 'Dados de entrada incompletos.');
    }

    const previousHash = await getPreviousAuditHash();

    const result = await db.runTransaction(async (tx) => {
      const movementRef = db.collection('stockMovements').doc(movementId);
      const movementDoc = await tx.get(movementRef);
      if (!movementDoc.exists) {
        throw new HttpsError('not-found', 'Movimento inexistente.');
      }

      const movement = movementDoc.data() as Record<string, unknown>;
      if (String(movement.tenantId ?? '') !== profile.tenantId) {
        throw new HttpsError('permission-denied', 'Tenant divergente.');
      }
      if (movement.status === 'COMPLETED') {
        return { alreadyCompleted: true, movementId };
      }

      const itemId = String(movement.itemId ?? '');
      const itemRef = db.collection('inventoryItems').doc(itemId);
      const itemDoc = await tx.get(itemRef);
      const movementQty = Number(movement.quantity ?? 0);
      const currentQty = Number((itemDoc.data() as Record<string, unknown> | undefined)?.quantity ?? 0);

      if (!itemDoc.exists) {
        tx.set(itemRef, {
          id: itemId,
          name: String(movement.itemName ?? 'Item de compra'),
          category: 'Outro',
          quantity: movementQty,
          unit: String(movement.unit ?? 'un'),
          minLevel: 0,
          location: 'Recebimento',
          lastUpdated: todayBR(),
          tenantId: profile.tenantId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.update(itemRef, {
          quantity: currentQty + movementQty,
          lastUpdated: todayBR(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      tx.update(movementRef, {
        status: 'COMPLETED',
        invoiceNumber,
        confirmedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      const auditRef = db.collection('auditEvents').doc();
      const baseAudit = {
        id: auditRef.id,
        timestamp: new Date().toISOString(),
        actor: uid,
        action: 'STOCK_INBOUND_CONFIRMED',
        details: `Entrada: ${String(movement.itemName ?? itemId)} (${movementQty})`,
        geolocation: '-15.123, -47.654',
        verified: true,
        tenantId: profile.tenantId,
      };
      const hash = hashAudit(baseAudit, previousHash);

      tx.set(auditRef, {
        ...baseAudit,
        hash,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { alreadyCompleted: false, movementId, auditEventId: auditRef.id };
    });

    return {
      success: true,
      movementId: result.movementId,
      alreadyCompleted: Boolean(result.alreadyCompleted),
      auditEventId: result.auditEventId,
    };
  }
);

export const secureRegisterStockLoss = onCall(
  {
    region: 'southamerica-east1',
    timeoutSeconds: 60,
    maxInstances: 20,
    enforceAppCheck: ENFORCE_APP_CHECK,
  },
  async (
    request: CallableRequest<{ itemId?: string; quantity?: number; reason?: string; proofUrl?: string; requester?: string }>
  ) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Usuario nao autenticado.');
    }

    const profile = await requireRole(uid);
    const itemId = String(request.data?.itemId ?? '');
    const quantity = Number(request.data?.quantity ?? 0);
    const reason = String(request.data?.reason ?? '').trim();
    const proofUrl = String(request.data?.proofUrl ?? '').trim();
    const requester = String(request.data?.requester ?? '').trim() || uid;

    if (!itemId || quantity <= 0 || !reason) {
      throw new HttpsError('invalid-argument', 'Dados de perda invalidos.');
    }
    if (!proofUrl) {
      throw new HttpsError('invalid-argument', 'Comprovante da perda nao informado.');
    }

    const previousHash = await getPreviousAuditHash();

    const txResult = await db.runTransaction(async (tx) => {
      const itemRef = db.collection('inventoryItems').doc(itemId);
      const itemDoc = await tx.get(itemRef);
      if (!itemDoc.exists) {
        throw new HttpsError('not-found', 'Item nao encontrado.');
      }

      const item = itemDoc.data() as Record<string, unknown>;
      if (Number(item.quantity ?? 0) < quantity) {
        throw new HttpsError('failed-precondition', 'Saldo insuficiente para registrar perda.');
      }

      tx.update(itemRef, {
        quantity: Number(item.quantity) - quantity,
        lastUpdated: todayBR(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      const movementRef = db.collection('stockMovements').doc();
      const auditRef = db.collection('auditEvents').doc();
      const unit = String(item.unit ?? 'un');
      const itemName = String(item.name ?? itemId);

      const baseAudit = {
        id: auditRef.id,
        timestamp: new Date().toISOString(),
        actor: uid,
        action: 'STOCK_OUTBOUND_LOSS',
        details: `Baixa de ${quantity} ${unit} de ${itemName}. Motivo: ${reason}`,
        geolocation: '-15.123, -47.654',
        verified: true,
        proofUrl,
        tenantId: profile.tenantId,
      };
      const hash = hashAudit(baseAudit, previousHash);

      tx.set(movementRef, {
        id: movementRef.id,
        itemId,
        itemName,
        type: 'OUTBOUND_LOSS',
        quantity,
        unit,
        date: todayBR(),
        status: 'AUDITED',
        requester,
        reason,
        proofUrl,
        auditHash: hash,
        tenantId: profile.tenantId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(auditRef, {
        ...baseAudit,
        hash,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { movementId: movementRef.id, auditEventId: auditRef.id };
    });

    return {
      success: true,
      movementId: txResult.movementId,
      auditEventId: txResult.auditEventId,
    };
  }
);
