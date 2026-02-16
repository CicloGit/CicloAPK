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

const resolveBaseUrl = () => {
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;
  const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim();

  const explicit = import.meta.env.VITE_BACKEND_BASE_URL as string | undefined;
  if (explicit && explicit.trim().length > 0) {
    const normalized = explicit.replace(/\/$/, '');
    if (isProd && /localhost|127\.0\.0\.1/i.test(normalized)) {
      throw new Error('VITE_BACKEND_BASE_URL invalido para producao.');
    }
    return normalized;
  }

  const useEmulator = isDev && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
  if (useEmulator) {
    const localProjectId = projectId || 'ciclo-plus-local';
    return `http://127.0.0.1:5001/${localProjectId}/us-central1/api`;
  }

  if (projectId && !projectId.toLowerCase().includes('local')) {
    return `https://us-central1-${projectId}.cloudfunctions.net/api`;
  }

  if (isProd) {
    throw new Error('VITE_BACKEND_BASE_URL nao configurado para producao.');
  }

  throw new Error('Nao foi possivel resolver a URL do backend.');
};

const API_BASE_URL = resolveBaseUrl();

const getToken = async (): Promise<string> => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Usuario nao autenticado.');
  }
  return user.getIdToken();
};

async function request<T>(path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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

export const backendApi = {
  lookupCar(carCode: string) {
    return request<CarLookupPayload>('/v1/car/lookup', { carCode });
  },

  analyzeImage(imageName: string) {
    return request<BackendAIResult>('/v1/ai/analyze', { imageName });
  },
};
