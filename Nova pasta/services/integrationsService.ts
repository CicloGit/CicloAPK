import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export type IntegrationConnectionStatus = 'CONNECTED' | 'DISCONNECTED';
export type IntegrationAvailabilityStatus = 'ACTIVE' | 'INACTIVE';

export interface IntegrationStatus {
  erp: {
    status: IntegrationConnectionStatus;
    provider: string;
  };
  payments: {
    provider: 'Asaas';
    status: IntegrationConnectionStatus;
    environment: 'PRODUCAO' | 'HOMOLOGACAO';
  };
  gov: {
    sefaz: IntegrationAvailabilityStatus;
    agrodefesa: IntegrationAvailabilityStatus;
  };
  credit: {
    serasa: IntegrationAvailabilityStatus;
    sicar: IntegrationAvailabilityStatus;
  };
  data: {
    sources: string[];
  };
}

const statusDocRef = doc(db, 'integrationStatus', 'default');
const requestsCollection = collection(db, 'integrationRequests');

const defaultStatus: IntegrationStatus = {
  erp: {
    status: 'DISCONNECTED',
    provider: 'Totvs (Protheus/RM)',
  },
  payments: {
    provider: 'Asaas',
    status: 'CONNECTED',
    environment: 'PRODUCAO',
  },
  gov: {
    sefaz: 'ACTIVE',
    agrodefesa: 'INACTIVE',
  },
  credit: {
    serasa: 'ACTIVE',
    sicar: 'ACTIVE',
  },
  data: {
    sources: ['CONAB (Safra)', 'CEPEA (Precos)', 'INMET (Clima)'],
  },
};

let seeded = false;

const toIntegrationStatus = (raw: Record<string, unknown> | undefined): IntegrationStatus => {
  if (!raw) {
    return defaultStatus;
  }

  const erpRaw = (raw.erp as Record<string, unknown> | undefined) ?? {};
  const paymentsRaw = (raw.payments as Record<string, unknown> | undefined) ?? {};
  const govRaw = (raw.gov as Record<string, unknown> | undefined) ?? {};
  const creditRaw = (raw.credit as Record<string, unknown> | undefined) ?? {};
  const dataRaw = (raw.data as Record<string, unknown> | undefined) ?? {};

  return {
    erp: {
      status: (erpRaw.status as IntegrationConnectionStatus) ?? defaultStatus.erp.status,
      provider: String(erpRaw.provider ?? defaultStatus.erp.provider),
    },
    payments: {
      provider: 'Asaas',
      status: (paymentsRaw.status as IntegrationConnectionStatus) ?? defaultStatus.payments.status,
      environment: (paymentsRaw.environment as IntegrationStatus['payments']['environment']) ?? defaultStatus.payments.environment,
    },
    gov: {
      sefaz: (govRaw.sefaz as IntegrationAvailabilityStatus) ?? defaultStatus.gov.sefaz,
      agrodefesa: (govRaw.agrodefesa as IntegrationAvailabilityStatus) ?? defaultStatus.gov.agrodefesa,
    },
    credit: {
      serasa: (creditRaw.serasa as IntegrationAvailabilityStatus) ?? defaultStatus.credit.serasa,
      sicar: (creditRaw.sicar as IntegrationAvailabilityStatus) ?? defaultStatus.credit.sicar,
    },
    data: {
      sources: Array.isArray(dataRaw.sources) ? dataRaw.sources.map(String) : defaultStatus.data.sources,
    },
  };
};

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDoc(statusDocRef);
  if (!snapshot.exists()) {
    await setDoc(statusDocRef, {
      ...defaultStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  seeded = true;
}

export const integrationsService = {
  async getStatus(): Promise<IntegrationStatus> {
    await ensureSeedData();
    const snapshot = await getDoc(statusDocRef);
    return toIntegrationStatus(snapshot.data() as Record<string, unknown> | undefined);
  },

  async updateStatus(partial: Partial<IntegrationStatus>): Promise<void> {
    await ensureSeedData();
    await setDoc(
      statusDocRef,
      {
        ...partial,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  async requestIntegration(type: string): Promise<void> {
    await addDoc(requestsCollection, {
      type,
      status: 'REQUESTED',
      createdAt: serverTimestamp(),
    });
  },
};
