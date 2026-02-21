import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { IntegratedProducer, IntegratorMessage, PartnershipOffer } from '../types';

export type IntegratorApiAuthMode = 'LOGIN' | 'API';
export type IntegratorApiStatus = 'ATIVA' | 'PENDENTE' | 'ERRO';

export interface IntegratorApiLink {
  id: string;
  ownerId: string;
  companyName: string;
  baseUrl: string;
  clientId: string;
  authMode: IntegratorApiAuthMode;
  apiKeyHint?: string;
  status: IntegratorApiStatus;
  lastValidationAt?: string;
  updatedAtLabel?: string;
}

const producersCollection = collection(db, 'integratedProducers');
const offersCollection = collection(db, 'partnershipOffers');
const messagesCollection = collection(db, 'integratorMessages');
const integrationStatusCollection = collection(db, 'integrationStatus');

const nowLabel = (): string => new Date().toLocaleString('pt-BR');

const toIntegratedProducer = (id: string, raw: Record<string, unknown>): IntegratedProducer => ({
  id,
  maskedName: String(raw.maskedName ?? ''),
  region: String(raw.region ?? ''),
  productionType: (raw.productionType as IntegratedProducer['productionType']) ?? 'Agricultura',
  status: (raw.status as IntegratedProducer['status']) ?? 'Disponivel',
  capacity: String(raw.capacity ?? ''),
  auditScore: Number(raw.auditScore ?? 0),
  lastAuditDate: String(raw.lastAuditDate ?? ''),
});

const toPartnershipOffer = (id: string, raw: Record<string, unknown>): PartnershipOffer => ({
  id,
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  type: (raw.type as PartnershipOffer['type']) ?? 'Compra Garantida',
  status: (raw.status as PartnershipOffer['status']) ?? 'Aberta',
  applicants: Number(raw.applicants ?? 0),
});

const toIntegratorMessage = (id: string, raw: Record<string, unknown>): IntegratorMessage => ({
  id,
  from: String(raw.from ?? ''),
  to: String(raw.to ?? ''),
  content: String(raw.content ?? ''),
  date: String(raw.date ?? ''),
  isUrgent: Boolean(raw.isUrgent),
});

const toIntegratorApiLink = (id: string, raw: Record<string, unknown>): IntegratorApiLink => ({
  id,
  ownerId: String(raw.ownerId ?? ''),
  companyName: String(raw.companyName ?? ''),
  baseUrl: String(raw.baseUrl ?? ''),
  clientId: String(raw.clientId ?? ''),
  authMode: (raw.authMode as IntegratorApiAuthMode) ?? 'API',
  apiKeyHint: raw.apiKeyHint ? String(raw.apiKeyHint) : undefined,
  status: (raw.status as IntegratorApiStatus) ?? 'PENDENTE',
  lastValidationAt: raw.lastValidationAt ? String(raw.lastValidationAt) : undefined,
  updatedAtLabel: raw.updatedAtLabel ? String(raw.updatedAtLabel) : undefined,
});

const validateBaseUrl = (baseUrl: string): string => {
  const normalized = baseUrl.trim().replace(/\/$/, '');
  if (!normalized) {
    throw new Error('Informe a URL base da API da industria.');
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('URL da API invalida.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('A URL da API deve usar http ou https.');
  }

  return normalized;
};

export const integratorService = {
  async listProducers(): Promise<IntegratedProducer[]> {
    const snapshot = await getDocs(producersCollection);
    return snapshot.docs.map((docSnapshot: any) => toIntegratedProducer(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listOffers(): Promise<PartnershipOffer[]> {
    const snapshot = await getDocs(offersCollection);
    return snapshot.docs.map((docSnapshot: any) => toPartnershipOffer(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listMessages(): Promise<IntegratorMessage[]> {
    const snapshot = await getDocs(messagesCollection);
    return snapshot.docs.map((docSnapshot: any) => toIntegratorMessage(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async createMessage(content: string): Promise<IntegratorMessage> {
    const newMessage: IntegratorMessage = {
      id: `MSG-${Date.now()}`,
      from: 'Integradora',
      to: 'All',
      content,
      date: 'Agora',
      isUrgent: false,
    };

    await setDoc(doc(db, 'integratorMessages', newMessage.id), {
      ...newMessage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newMessage;
  },

  async createDemand(data: Pick<PartnershipOffer, 'title' | 'description' | 'type'>): Promise<PartnershipOffer> {
    const newDemand: PartnershipOffer = {
      id: `DEM-${Date.now()}`,
      title: data.title,
      description: data.description,
      type: data.type,
      status: 'Aberta',
      applicants: 0,
    };

    await setDoc(doc(db, 'partnershipOffers', newDemand.id), {
      ...newDemand,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newDemand;
  },

  async updateOfferStatus(offerId: string, status: PartnershipOffer['status']): Promise<void> {
    if (!offerId.trim()) {
      throw new Error('Oferta invalida.');
    }

    await setDoc(
      doc(db, 'partnershipOffers', offerId),
      {
        status,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  async getApiLink(ownerId: string): Promise<IntegratorApiLink | null> {
    if (!ownerId.trim()) {
      return null;
    }

    const docId = `INTEGRATOR_API_${ownerId}`;
    const snapshot = await getDoc(doc(db, 'integrationStatus', docId));

    if (!snapshot.exists()) {
      return null;
    }

    return toIntegratorApiLink(snapshot.id, snapshot.data() as Record<string, unknown>);
  },

  async saveApiLink(payload: {
    ownerId: string;
    companyName: string;
    baseUrl: string;
    clientId: string;
    authMode: IntegratorApiAuthMode;
    apiKey?: string;
  }): Promise<IntegratorApiLink> {
    const ownerId = payload.ownerId.trim();
    if (!ownerId) {
      throw new Error('Usuario da Integradora nao identificado.');
    }

    const companyName = payload.companyName.trim();
    const clientId = payload.clientId.trim();
    if (!companyName || !clientId) {
      throw new Error('Informe razao social e client id para vincular a API.');
    }

    const baseUrl = validateBaseUrl(payload.baseUrl);
    const apiKeyHint = payload.apiKey?.trim() ? payload.apiKey.trim().slice(-4) : undefined;
    const docId = `INTEGRATOR_API_${ownerId}`;
    const validationMoment = nowLabel();

    const documentPayload = {
      ownerId,
      companyName,
      baseUrl,
      clientId,
      authMode: payload.authMode,
      apiKeyHint: apiKeyHint ?? null,
      status: 'ATIVA' as const,
      type: 'INTEGRATOR_API',
      lastValidationAt: validationMoment,
      updatedAtLabel: validationMoment,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'integrationStatus', docId), documentPayload, { merge: true });

    return {
      id: docId,
      ownerId,
      companyName,
      baseUrl,
      clientId,
      authMode: payload.authMode,
      apiKeyHint,
      status: 'ATIVA',
      lastValidationAt: validationMoment,
      updatedAtLabel: validationMoment,
    };
  },
};
