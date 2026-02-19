import { getAuth } from 'firebase/auth';

interface BackendResponse<T> {
  data: T;
}

interface CarLookupPayload {
  protocol: string;
  municipality: string;
  totalArea: string;
  rl: string;
  app: string;
  status: string;
  owner: string;
}

export interface BackendAIResult {
  diagnosis: string;
  confidence: number;
  recommendation: string;
  action: 'TREAT' | 'STUDY';
  product?: string;
}

export interface EvidencePayload {
  type: 'TYPE_A' | 'TYPE_B';
  storagePath?: string;
  fileHash?: string;
  gps?: {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp?: string;
  };
  telemetry?: {
    source: string;
    capturedAt: string;
    data?: Record<string, unknown>;
  };
  documents?: Array<{
    kind: string;
    storagePath?: string;
    hash?: string;
  }>;
  metadata?: Record<string, unknown>;
}

export type ConsumerMarketChannel = 'WHOLESALE_DIRECT' | 'RETAIL_MARKETS';

export interface PlaceOrderPayload {
  listingId?: string;
  listing?: Record<string, unknown>;
  quantity: number;
  unitPrice?: number;
  paymentMethod?: string;
  channel?: ConsumerMarketChannel;
  domain?: 'MARKETPLACE' | 'CONSUMER_MARKET';
  transactionId?: string;
}

export interface PublishListingPayload {
  listingId?: string;
  listing: Record<string, unknown>;
  channel?: ConsumerMarketChannel;
  domain?: 'MARKETPLACE' | 'CONSUMER_MARKET';
}

export interface UpdateListingStatusPayload {
  listingId: string;
  status: 'PUBLISHED' | 'PAUSED' | 'CLOSED';
}

export interface ResolveOrderPayload {
  orderId?: string;
  supplierOrderId?: string;
}

export interface SignContractPayload extends ResolveOrderPayload {
  contractTerms?: string;
  evidences?: EvidencePayload[];
  contractUrl?: string;
}

export interface DispatchPayload extends ResolveOrderPayload {
  evidences?: EvidencePayload[];
  telemetry?: Record<string, unknown>;
}

export interface DeliveryPayload extends ResolveOrderPayload {
  evidences?: EvidencePayload[];
  requireDocumentTypeB?: boolean;
}

export interface ReleaseSettlementPayload extends ResolveOrderPayload {
  settlementId?: string;
  amount?: number;
}

export type PublicMarketPriceCategory = 'COMMODITY' | 'LIVESTOCK' | 'INPUT';

export interface PublicMarketPricePayload {
  symbol: string;
  category: PublicMarketPriceCategory;
  name: string;
  unit: string;
  currency: string;
  price: number;
  change1d: number;
  change7d: number;
  change30d: number;
  source?: string;
  sourceRef?: string;
  region?: string;
  updatedAt?: string | null;
}

export interface PublicInputCostIndexPayload {
  window7d: number;
  window30d: number;
  componentsUsed: Array<{ symbol: string; weight: number; change7d: number; change30d: number }>;
  staleComponents: string[];
  updatedAt?: string | null;
}

export interface PublicMarketSummaryPayload {
  updatedAt: string;
  countsByCategory: Record<PublicMarketPriceCategory, number>;
  topCommodities: PublicMarketPricePayload[];
  topLivestock: PublicMarketPricePayload[];
  topInputs: PublicMarketPricePayload[];
  inputCostIndex: PublicInputCostIndexPayload | null;
}

const resolveBaseUrl = (functionName: 'api' | 'marketApi' | 'supportApi' = 'api') => {
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;
  const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim();

  const explicit = import.meta.env.VITE_BACKEND_BASE_URL as string | undefined;
  if (explicit && explicit.trim().length > 0) {
    const normalized = explicit.replace(/\/$/, '');
    const derived = functionName === 'api' ? normalized : normalized.replace(/\/api$/i, `/${functionName}`);
    if (isProd && /localhost|127\.0\.0\.1/i.test(derived)) {
      throw new Error('VITE_BACKEND_BASE_URL invalido para producao.');
    }
    return derived;
  }

  const useEmulator = isDev && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
  if (useEmulator) {
    const localProjectId = projectId || 'ciclo-plus-local';
    return `http://127.0.0.1:5001/${localProjectId}/us-central1/${functionName}`;
  }

  if (projectId && !projectId.toLowerCase().includes('local')) {
    return `https://us-central1-${projectId}.cloudfunctions.net/${functionName}`;
  }

  if (isProd) {
    throw new Error('VITE_BACKEND_BASE_URL nao configurado para producao.');
  }

  throw new Error('Nao foi possivel resolver a URL do backend.');
};

const API_BASE_URL = resolveBaseUrl('api');

const getToken = async (): Promise<string> => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuario nao autenticado.');
  }
  return user.getIdToken();
};

async function request<T>(path: string, body?: unknown): Promise<T> {
  return requestInternal<T>(path, body, true);
}

async function requestInternal<T>(path: string, body: unknown, requireAuth: boolean): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const token = await getToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string } & Partial<BackendResponse<T>>;

  if (!response.ok) {
    throw new Error(payload.error ?? 'Falha no backend.');
  }

  if (!payload.data) {
    throw new Error('Resposta invalida do backend.');
  }

  return payload.data;
}

async function publicRequest<T>(path: string): Promise<T> {
  return requestInternal<T>(path, undefined, false);
}

export const backendApi = {
  lookupCar(carCode: string) {
    return request<CarLookupPayload>('/v1/car/lookup', { carCode });
  },

  analyzeImage(imageName: string) {
    return request<BackendAIResult>('/v1/ai/analyze', { imageName });
  },

  marketHealth() {
    return request<{ status: string; module: string; timestamp: string }>('/v1/market/health');
  },

  marketPublishListing(payload: PublishListingPayload) {
    return request<{ listingId: string; status: string }>('/v1/market/publish-listing', payload);
  },

  marketUpdateListingStatus(payload: UpdateListingStatusPayload) {
    return request<{ listingId: string; status: string }>('/v1/market/update-listing-status', payload);
  },

  marketPlaceOrder(payload: PlaceOrderPayload) {
    return request<{ orderId: string; supplierOrderId: string; transactionId: string; status: string }>(
      '/v1/market/place-order',
      payload
    );
  },

  marketReserveStock(payload: ResolveOrderPayload) {
    return request<{ orderId: string; status: string }>('/v1/market/reserve-stock', payload);
  },

  marketSignContract(payload: SignContractPayload) {
    return request<{ orderId: string; contractId: string; status: string }>('/v1/market/sign-contract', payload);
  },

  marketCreateEscrow(payload: ResolveOrderPayload & { amount?: number }) {
    return request<{ orderId: string; settlementId: string; status: string }>('/v1/market/create-escrow', payload);
  },

  marketConfirmDispatch(payload: DispatchPayload) {
    return request<{ orderId: string; status: string }>('/v1/market/confirm-dispatch', payload);
  },

  marketConfirmDelivery(payload: DeliveryPayload) {
    return request<{ orderId: string; status: string }>('/v1/market/confirm-delivery', payload);
  },

  marketReleaseSettlement(payload: ReleaseSettlementPayload) {
    return request<{
      orderId: string;
      settlementId: string;
      status: string;
      splitItems: Array<{ party: string; share: number; amount: number }>;
    }>('/v1/market/release-settlement', payload);
  },

  marketOpenDispute(payload: ResolveOrderPayload & { reason: string; message?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }) {
    return request<{ orderId: string; disputeId: string; ticketId: string; status: string }>('/v1/market/open-dispute', payload);
  },

  marketResolveDispute(payload: { disputeId: string; status?: 'RESOLVED' | 'REJECTED'; resolution?: string; note?: string }) {
    return request<{ disputeId: string; status: string }>('/v1/market/resolve-dispute', payload);
  },

  marketVerifyAuditChain(payload?: { startSequence?: number; endSequence?: number; limit?: number }) {
    return request<{
      tenantId: string;
      valid: boolean;
      checked: number;
      firstBrokenSequence: number | null;
      expectedHash?: string;
      actualHash?: string;
    }>('/v1/market/verify-audit-chain', payload ?? {});
  },

  supportOpenTicket(payload: { orderId?: string; subject: string; message?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }) {
    return request<{ ticketId: string; status: string }>('/v1/support/open-ticket', payload);
  },

  supportAddMessage(payload: { ticketId: string; message: string }) {
    return request<{ ticketId: string; messageId: string }>('/v1/support/add-message', payload);
  },

  supportRequestApproval(payload: { ticketId: string; actionType: string; reason: string }) {
    return request<{ requestId: string; status: string }>('/v1/support/request-approval', payload);
  },

  supportDecideApproval(payload: { requestId: string; decision?: 'APPROVED' | 'REJECTED'; note?: string }) {
    return request<{ requestId: string; status: string }>('/v1/support/decide-approval', payload);
  },

  publicMarketSummary() {
    return publicRequest<PublicMarketSummaryPayload>('/v1/public/market/summary');
  },

  publicMarketPrices(category?: PublicMarketPriceCategory) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return publicRequest<{ category?: PublicMarketPriceCategory; updatedAt: string; items: PublicMarketPricePayload[] }>(
      `/v1/public/market/prices${query}`
    );
  },

  publicInputCostIndex() {
    return publicRequest<PublicInputCostIndexPayload>('/v1/public/market/index/input-cost');
  },
};
