import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { HttpsError, onCall, onRequest, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import type { Request, Response } from 'express';
import { MarketKernel } from './core/marketKernel.js';

initializeApp();

const db = getFirestore();
const adminAuth = getAuth();
const marketKernel = new MarketKernel(db);
const ENFORCE_APP_CHECK = process.env.FUNCTIONS_ENFORCE_APP_CHECK === 'true';
const STOCK_ALLOWED_ROLES = new Set(['Produtor', 'Gestor', 'Fornecedor']);
const ROLE_CLAIM_MAP: Record<string, string> = {
  PRODUCER: 'PRODUCER',
  PRODUTOR: 'PRODUCER',
  SUPPLIER: 'SUPPLIER',
  FORNECEDOR: 'SUPPLIER',
  INTEGRATOR: 'INTEGRATOR',
  INTEGRADORA: 'INTEGRATOR',
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
  TECHNICIAN: 'Técnico',
  INVESTOR: 'Investidor',
  MANAGER: 'Gestor',
  TRAFFIC_MANAGER: 'Gestor de Trafego',
  OPERATOR: 'Operador',
  ADMIN: 'Administrador',
};

type AIAction = 'TREAT' | 'STUDY';

interface AIAnalysisResult {
  diagnosis: string;
  confidence: number;
  recommendation: string;
  action: AIAction;
  product?: string;
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

const PUBLIC_PRICE_CATEGORIES = new Set<PublicMarketPriceCategory>(['COMMODITY', 'LIVESTOCK', 'INPUT']);

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
    const items = snapshot.docs.map(mapPriceDoc).sort((a, b) => a.name.localeCompare(b.name));
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
    const prices = pricesSnapshot.docs.map(mapPriceDoc);

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

const resolveAIResult = (imageName: string): AIAnalysisResult => {
  const normalized = imageName.toLowerCase();

  if (normalized.includes('ferrugem') || normalized.includes('rust')) {
    return {
      diagnosis: 'Ferrugem Asiatica (Estagio Inicial)',
      confidence: 94,
      recommendation: 'Aplicacao imediata de fungicida sistemico para controle.',
      action: 'TREAT',
      product: 'Fungicida Triazol + Estrobilurina',
    };
  }

  if (normalized.includes('praga') || normalized.includes('lagarta')) {
    return {
      diagnosis: 'Pressao de praga foliar',
      confidence: 88,
      recommendation: 'Iniciar manejo integrado com monitoramento e controle localizado.',
      action: 'TREAT',
      product: 'Inseticida biologico (Bacillus thuringiensis)',
    };
  }

  return {
    diagnosis: 'Anomalia nutricional (confirmacao recomendada)',
    confidence: 71,
    recommendation: 'Executar analise foliar e validar em campo com tecnico responsavel.',
    action: 'STUDY',
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
  const result = resolveAIResult(imageName);

  await db.collection('aiAnalyses').add({
    imageName,
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      send(res, 401, { error: 'Nao autenticado.' });
      return;
    }

    if (error instanceof HttpsError) {
      send(res, mapHttpsStatus(error.code), { error: error.message, code: error.code });
      return;
    }

    send(res, 500, { error: 'Falha interna no backend.' });
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      send(res, 401, { error: 'Nao autenticado.' });
      return;
    }

    if (error instanceof HttpsError) {
      send(res, mapHttpsStatus(error.code), { error: error.message, code: error.code });
      return;
    }

    send(res, 500, { error: 'Falha interna no backend.' });
  }
});

export const supportApi = onRequest({ region: 'us-central1' }, async (req: Request, res: Response) => {
  try {
    const routePath = normalizeDirectPath(req.path, '/v1/support');
    await handleMarketKernel(req, res, routePath);
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      send(res, 401, { error: 'Nao autenticado.' });
      return;
    }

    if (error instanceof HttpsError) {
      send(res, mapHttpsStatus(error.code), { error: error.message, code: error.code });
      return;
    }

    send(res, 500, { error: 'Falha interna no backend.' });
  }
});

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
