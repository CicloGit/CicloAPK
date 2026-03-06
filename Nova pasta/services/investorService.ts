import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { resolveTenantContext, withTenantFields } from './tenantContext';

export interface InvestorKpi {
  id: string;
  label: string;
  value: string;
  color: string;
  icon: 'library' | 'cash' | 'trend' | 'briefcase';
}

export interface InvestorProject {
  id: string;
  name: string;
  invested: string;
  status: 'Ativo' | 'Concluido';
  expectedReturn: string;
  portfolio: 'Credito Estruturado' | 'Renda Variavel Agro' | 'Infraestrutura';
}

export interface InvestorMarketSignal {
  id: string;
  market: string;
  trend: 'Alta' | 'Baixa' | 'Estavel';
  variation: string;
  outlook: string;
}

export interface InvestorDemand {
  id: string;
  projectName: string;
  technician: string;
  stage: string;
  requestedAmount: number;
  status: 'Aberta' | 'Em Analise' | 'Aprovada';
}

export interface InvestorLiquidationForecast {
  id: string;
  asset: string;
  expectedDate: string;
  amount: number;
  confidence: 'Alta' | 'Media' | 'Baixa';
}

export interface InvestorMovement {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: 'Entrada' | 'Saida' | 'Bloqueio Escrow' | 'Liberacao Escrow';
  auditStatus: 'Validado' | 'Pendente';
  settlement: 'Split' | 'Escrow' | 'Direto';
}

const kpiCollection = collection(db, 'investorKpis');
const projectsCollection = collection(db, 'investorProjects');
const marketSignalsCollection = collection(db, 'investorMarketSignals');
const demandsCollection = collection(db, 'investorDemands');
const forecastsCollection = collection(db, 'investorLiquidationForecasts');
const movementsCollection = collection(db, 'investorMovements');

const formatToday = (): string => new Date().toLocaleDateString('pt-BR');

const sanitizeAmount = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const normalized = Number(value);
  return Number(normalized.toFixed(2));
};

const toKpi = (id: string, raw: Record<string, unknown>): InvestorKpi => ({
  id,
  label: String(raw.label ?? ''),
  value: String(raw.value ?? ''),
  color: String(raw.color ?? 'text-indigo-600'),
  icon: (raw.icon as InvestorKpi['icon']) ?? 'library',
});

const toProject = (id: string, raw: Record<string, unknown>): InvestorProject => ({
  id,
  name: String(raw.name ?? ''),
  invested: String(raw.invested ?? ''),
  status: (raw.status as InvestorProject['status']) ?? 'Ativo',
  expectedReturn: String(raw.expectedReturn ?? ''),
  portfolio: (raw.portfolio as InvestorProject['portfolio']) ?? 'Credito Estruturado',
});

const toMarketSignal = (id: string, raw: Record<string, unknown>): InvestorMarketSignal => ({
  id,
  market: String(raw.market ?? ''),
  trend: (raw.trend as InvestorMarketSignal['trend']) ?? 'Estavel',
  variation: String(raw.variation ?? ''),
  outlook: String(raw.outlook ?? ''),
});

const toDemand = (id: string, raw: Record<string, unknown>): InvestorDemand => ({
  id,
  projectName: String(raw.projectName ?? ''),
  technician: String(raw.technician ?? ''),
  stage: String(raw.stage ?? ''),
  requestedAmount: Number(raw.requestedAmount ?? 0),
  status: (raw.status as InvestorDemand['status']) ?? 'Aberta',
});

const toForecast = (id: string, raw: Record<string, unknown>): InvestorLiquidationForecast => ({
  id,
  asset: String(raw.asset ?? ''),
  expectedDate: String(raw.expectedDate ?? ''),
  amount: Number(raw.amount ?? 0),
  confidence: (raw.confidence as InvestorLiquidationForecast['confidence']) ?? 'Media',
});

const toMovement = (id: string, raw: Record<string, unknown>): InvestorMovement => ({
  id,
  date: String(raw.date ?? ''),
  description: String(raw.description ?? ''),
  amount: Number(raw.amount ?? 0),
  direction: (raw.direction as InvestorMovement['direction']) ?? 'Entrada',
  auditStatus: (raw.auditStatus as InvestorMovement['auditStatus']) ?? 'Pendente',
  settlement: (raw.settlement as InvestorMovement['settlement']) ?? 'Direto',
});

const upsertDemandDocument = async (
  demand: InvestorDemand,
  context: Awaited<ReturnType<typeof resolveTenantContext>>
): Promise<void> => {
  await setDoc(
    doc(db, 'investorDemands', demand.id),
    withTenantFields(
      {
        ...demand,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      context
    ),
    { merge: true }
  );
};

export const investorService = {
  async listKpis(): Promise<InvestorKpi[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(kpiCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs.map((docSnapshot: any) => toKpi(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listProjects(): Promise<InvestorProject[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(projectsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs.map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listMarketSignals(): Promise<InvestorMarketSignal[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(marketSignalsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs.map((docSnapshot: any) => toMarketSignal(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listInvestmentDemands(): Promise<InvestorDemand[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(demandsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs.map((docSnapshot: any) => toDemand(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listLiquidationForecasts(): Promise<InvestorLiquidationForecast[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(forecastsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs.map((docSnapshot: any) => toForecast(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listMovements(): Promise<InvestorMovement[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(movementsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs.map((docSnapshot: any) => toMovement(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async allocateCapital(payload: { amount: number; description?: string; settlement?: InvestorMovement['settlement'] }): Promise<InvestorMovement> {
    const context = await resolveTenantContext();
    const amount = sanitizeAmount(payload.amount);
    if (amount <= 0) {
      throw new Error('Informe um valor de aporte maior que zero.');
    }

    const movementPayload = {
      date: formatToday(),
      description: payload.description?.trim() || 'Aporte de capital na conta vinculada Asaas',
      amount,
      direction: 'Entrada' as const,
      auditStatus: 'Pendente' as const,
      settlement: payload.settlement ?? 'Direto',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const movementRef = await addDoc(movementsCollection, withTenantFields(movementPayload, context));

    return {
      id: movementRef.id,
      date: movementPayload.date,
      description: movementPayload.description,
      amount: movementPayload.amount,
      direction: movementPayload.direction,
      auditStatus: movementPayload.auditStatus,
      settlement: movementPayload.settlement,
    };
  },

  async requestWithdrawal(payload: { amount: number; description?: string }): Promise<InvestorMovement> {
    const context = await resolveTenantContext();
    const amount = sanitizeAmount(payload.amount);
    if (amount <= 0) {
      throw new Error('Informe um valor de retirada maior que zero.');
    }

    const movementPayload = {
      date: formatToday(),
      description: payload.description?.trim() || 'Solicitacao de retirada da conta vinculada Asaas',
      amount,
      direction: 'Saida' as const,
      auditStatus: 'Pendente' as const,
      settlement: 'Direto' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const movementRef = await addDoc(movementsCollection, withTenantFields(movementPayload, context));

    return {
      id: movementRef.id,
      date: movementPayload.date,
      description: movementPayload.description,
      amount: movementPayload.amount,
      direction: movementPayload.direction,
      auditStatus: movementPayload.auditStatus,
      settlement: movementPayload.settlement,
    };
  },

  async reviewDemand(demand: InvestorDemand, status: InvestorDemand['status']): Promise<InvestorDemand> {
    const context = await resolveTenantContext();
    const updated: InvestorDemand = {
      ...demand,
      status,
    };

    await upsertDemandDocument(updated, context);
    return updated;
  },
};
