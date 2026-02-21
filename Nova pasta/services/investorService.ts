import { addDoc, collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

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

const defaultKpis: InvestorKpi[] = [
  {
    id: 'KPI-1',
    label: 'Capital Total Investido',
    value: 'R$ 1.840.000',
    color: 'text-indigo-600',
    icon: 'briefcase',
  },
  {
    id: 'KPI-2',
    label: 'Liquidez Prevista 90d',
    value: 'R$ 624.000',
    color: 'text-emerald-600',
    icon: 'cash',
  },
  {
    id: 'KPI-3',
    label: 'Projetos em Carteira',
    value: '12',
    color: 'text-amber-600',
    icon: 'library',
  },
  {
    id: 'KPI-4',
    label: 'Indice de Mercado',
    value: '+8.4%',
    color: 'text-blue-600',
    icon: 'trend',
  },
];

const defaultProjects: InvestorProject[] = [
  {
    id: 'PRJ-001',
    name: 'Projeto Bovino Norte',
    invested: 'R$ 420.000',
    status: 'Ativo',
    expectedReturn: '14.8%',
    portfolio: 'Credito Estruturado',
  },
  {
    id: 'PRJ-002',
    name: 'Corredor de Graos Centro-Oeste',
    invested: 'R$ 380.000',
    status: 'Ativo',
    expectedReturn: '12.3%',
    portfolio: 'Infraestrutura',
  },
  {
    id: 'PRJ-003',
    name: 'Expansao Integrada Frigorifico',
    invested: 'R$ 610.000',
    status: 'Ativo',
    expectedReturn: '16.1%',
    portfolio: 'Renda Variavel Agro',
  },
  {
    id: 'PRJ-004',
    name: 'Ciclo Safra Premium',
    invested: 'R$ 430.000',
    status: 'Concluido',
    expectedReturn: '11.6%',
    portfolio: 'Credito Estruturado',
  },
];

const defaultMarketSignals: InvestorMarketSignal[] = [
  {
    id: 'MKT-1',
    market: 'Boi Gordo',
    trend: 'Alta',
    variation: '+2.8% (7d)',
    outlook: 'Oferta ajustada e demanda interna resiliente.',
  },
  {
    id: 'MKT-2',
    market: 'Milho',
    trend: 'Estavel',
    variation: '+0.4% (7d)',
    outlook: 'Preco lateral com pressao de frete reduzida.',
  },
  {
    id: 'MKT-3',
    market: 'Soja',
    trend: 'Baixa',
    variation: '-1.1% (7d)',
    outlook: 'Ajuste tecnico de curto prazo e cambio moderado.',
  },
];

const defaultDemands: InvestorDemand[] = [
  {
    id: 'DEM-INV-1',
    projectName: 'Projeto Campo Sustentavel - MT',
    technician: 'Tecnico Carlos M.',
    stage: 'Implantacao de manejo',
    requestedAmount: 185000,
    status: 'Em Analise',
  },
  {
    id: 'DEM-INV-2',
    projectName: 'Recuperacao de Pastagem - GO',
    technician: 'Tecnica Ana P.',
    stage: 'Fase de execucao',
    requestedAmount: 92000,
    status: 'Aberta',
  },
  {
    id: 'DEM-INV-3',
    projectName: 'Modulo de Engorda Intensiva - MS',
    technician: 'Tecnico Rafael T.',
    stage: 'Pre-contratacao',
    requestedAmount: 264000,
    status: 'Aprovada',
  },
];

const defaultForecasts: InvestorLiquidationForecast[] = [
  {
    id: 'LQD-1',
    asset: 'Projeto Bovino Norte',
    expectedDate: '15/04/2026',
    amount: 148000,
    confidence: 'Alta',
  },
  {
    id: 'LQD-2',
    asset: 'Corredor de Graos Centro-Oeste',
    expectedDate: '02/05/2026',
    amount: 97000,
    confidence: 'Media',
  },
  {
    id: 'LQD-3',
    asset: 'Expansao Integrada Frigorifico',
    expectedDate: '28/05/2026',
    amount: 212000,
    confidence: 'Alta',
  },
];

const defaultMovements: InvestorMovement[] = [
  {
    id: 'MOV-1',
    date: '20/02/2026',
    description: 'Aporte adicional em carteira integrada',
    amount: 120000,
    direction: 'Entrada',
    auditStatus: 'Validado',
    settlement: 'Direto',
  },
  {
    id: 'MOV-2',
    date: '19/02/2026',
    description: 'Bloqueio preventivo para contrato com split',
    amount: 68000,
    direction: 'Bloqueio Escrow',
    auditStatus: 'Validado',
    settlement: 'Escrow',
  },
  {
    id: 'MOV-3',
    date: '17/02/2026',
    description: 'Liberacao de escrow apos validacao de eventos',
    amount: 51000,
    direction: 'Liberacao Escrow',
    auditStatus: 'Validado',
    settlement: 'Split',
  },
  {
    id: 'MOV-4',
    date: '15/02/2026',
    description: 'Resgate parcial para conta vinculada Asaas',
    amount: 35000,
    direction: 'Saida',
    auditStatus: 'Pendente',
    settlement: 'Direto',
  },
];

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

const upsertDemandDocument = async (demand: InvestorDemand): Promise<void> => {
  await setDoc(
    doc(db, 'investorDemands', demand.id),
    {
      ...demand,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const investorService = {
  async listKpis(): Promise<InvestorKpi[]> {
    const snapshot = await getDocs(kpiCollection);
    const items = snapshot.docs.map((docSnapshot: any) => toKpi(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
    return items.length > 0 ? items : defaultKpis;
  },

  async listProjects(): Promise<InvestorProject[]> {
    const snapshot = await getDocs(projectsCollection);
    const items = snapshot.docs.map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
    return items.length > 0 ? items : defaultProjects;
  },

  async listMarketSignals(): Promise<InvestorMarketSignal[]> {
    const snapshot = await getDocs(marketSignalsCollection);
    const items = snapshot.docs.map((docSnapshot: any) => toMarketSignal(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
    return items.length > 0 ? items : defaultMarketSignals;
  },

  async listInvestmentDemands(): Promise<InvestorDemand[]> {
    const snapshot = await getDocs(demandsCollection);
    const items = snapshot.docs.map((docSnapshot: any) => toDemand(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
    return items.length > 0 ? items : defaultDemands;
  },

  async listLiquidationForecasts(): Promise<InvestorLiquidationForecast[]> {
    const snapshot = await getDocs(forecastsCollection);
    const items = snapshot.docs.map((docSnapshot: any) => toForecast(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
    return items.length > 0 ? items : defaultForecasts;
  },

  async listMovements(): Promise<InvestorMovement[]> {
    const snapshot = await getDocs(movementsCollection);
    const items = snapshot.docs.map((docSnapshot: any) => toMovement(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
    return items.length > 0 ? items : defaultMovements;
  },

  async allocateCapital(payload: { amount: number; description?: string; settlement?: InvestorMovement['settlement'] }): Promise<InvestorMovement> {
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

    const movementRef = await addDoc(movementsCollection, movementPayload);

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

    const movementRef = await addDoc(movementsCollection, movementPayload);

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
    const updated: InvestorDemand = {
      ...demand,
      status,
    };

    await upsertDemandDocument(updated);
    return updated;
  },
};
