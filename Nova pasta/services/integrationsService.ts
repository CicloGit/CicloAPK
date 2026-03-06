import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { backendApi, SupportModuleRuntimePayload } from './backendApi';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

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

const requestsCollection = collection(db, 'integrationRequests');
const integrationStatusCollection = collection(db, 'integrationStatus');
const statusDocRef = (tenantId: string) => doc(db, 'integrationStatus', `default-${tenantId}`);
const MPV_PROVIDER_LABEL = 'MPV Ciclo (ERP + PDV)';

const defaultStatus: IntegrationStatus = {
  erp: {
    status: 'DISCONNECTED',
    provider: 'Nao configurado',
  },
  payments: {
    provider: 'Asaas',
    status: 'DISCONNECTED',
    environment: 'PRODUCAO',
  },
  gov: {
    sefaz: 'INACTIVE',
    agrodefesa: 'INACTIVE',
  },
  credit: {
    serasa: 'INACTIVE',
    sicar: 'INACTIVE',
  },
  data: {
    sources: [],
  },
};

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
      environment:
        (paymentsRaw.environment as IntegrationStatus['payments']['environment']) ??
        defaultStatus.payments.environment,
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
      sources: Array.isArray(dataRaw.sources)
        ? dataRaw.sources.map(String)
        : defaultStatus.data.sources,
    },
  };
};

const toMpvManagedState = (runtime?: SupportModuleRuntimePayload | null) =>
  Boolean(runtime && (runtime.enabled || runtime.baseUrl || runtime.lastConfiguredAt || runtime.lastConfiguredBy));

const toMpvConnectionStatus = (runtime?: SupportModuleRuntimePayload | null): IntegrationConnectionStatus => {
  if (!runtime || !runtime.enabled || !runtime.baseUrl) {
    return 'DISCONNECTED';
  }

  if (runtime.lastHealthCheck?.status === 'OFFLINE') {
    return 'DISCONNECTED';
  }

  return 'CONNECTED';
};

const mergeMpvRuntime = (
  status: IntegrationStatus,
  runtime?: SupportModuleRuntimePayload | null
): IntegrationStatus => {
  const isManagedByMpv = toMpvManagedState(runtime);
  if (!isManagedByMpv) {
    return status;
  }

  const connectionStatus = toMpvConnectionStatus(runtime);
  const sources = status.data.sources.filter((source) => source !== 'MPV Ciclo');

  return {
    ...status,
    erp: {
      ...status.erp,
      provider: MPV_PROVIDER_LABEL,
      status: connectionStatus,
    },
    payments: {
      ...status.payments,
      status: connectionStatus,
      environment: runtime?.environment === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO',
    },
    data: {
      ...status.data,
      sources: runtime?.enabled && runtime.baseUrl ? [...sources, 'MPV Ciclo'] : sources,
    },
  };
};

export const integrationsService = {
  async getStatus(): Promise<IntegrationStatus> {
    const context = await resolveTenantContext();
    let status = defaultStatus;

    const scopedSnapshot = await getDoc(statusDocRef(context.tenantId));
    if (scopedSnapshot.exists()) {
      status = toIntegrationStatus(scopedSnapshot.data() as Record<string, unknown> | undefined);
    } else {
      const legacySnapshot = await getDoc(doc(db, 'integrationStatus', 'default'));
      if (legacySnapshot.exists()) {
        const raw = legacySnapshot.data() as Record<string, unknown>;
        if (hasTenantAccess(raw, context)) {
          status = toIntegrationStatus(raw);
        }
      } else {
        const tenantSnapshot = await getDocs(
          query(integrationStatusCollection, where('tenantId', '==', context.tenantId))
        );
        const row = tenantSnapshot.docs[0];
        status = toIntegrationStatus(row?.data() as Record<string, unknown> | undefined);
      }
    }

    try {
      const modules = await backendApi.supportListModules();
      const mpvRuntime = modules.find((entry) => entry.moduleKey === 'MPV_CICLO') ?? null;
      return mergeMpvRuntime(status, mpvRuntime);
    } catch {
      return status;
    }
  },

  async updateStatus(partial: Partial<IntegrationStatus>): Promise<void> {
    const { erp: _erpIgnored, payments: _paymentsIgnored, ...safePartial } = partial;
    if (Object.keys(safePartial).length === 0) {
      return;
    }

    const context = await resolveTenantContext();
    await setDoc(
      statusDocRef(context.tenantId),
      withTenantFields(
        {
          ...safePartial,
          statusDocType: 'INTEGRATION_DEFAULT',
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );
  },

  async requestIntegration(type: string): Promise<void> {
    const context = await resolveTenantContext();
    await addDoc(
      requestsCollection,
      withTenantFields(
        {
          type,
          status: 'REQUESTED',
          createdAt: serverTimestamp(),
        },
        context
      )
    );
  },
};
