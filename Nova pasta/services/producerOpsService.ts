import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  ProducerApplicationArea,
  ProducerAnimalLot,
  ProducerExpense,
  ProducerInput,
  ProducerInputType,
  ProducerOperationalActivity,
  ProducerTargetSpecies,
} from '../types';
import { parseDateToTimestamp } from './dateUtils';

const lotsCollection = collection(db, 'producerAnimalLots');
const inputsCollection = collection(db, 'producerInputs');
const expensesCollection = collection(db, 'producerOperationalExpenses');
const activitiesCollection = collection(db, 'producerOperationalActivities');
const toLot = (id: string, raw: Record<string, unknown>): ProducerAnimalLot => ({
  id,
  name: String(raw.name ?? ''),
  category: String(raw.category ?? ''),
  headcount: Number(raw.headcount ?? 0),
  averageWeightKg: Number(raw.averageWeightKg ?? 0),
  createdAt: String(raw.createdAt ?? ''),
});

const inferInputType = (raw: Record<string, unknown>): ProducerInputType => {
  const directType = String(raw.inputType ?? '').toUpperCase();
  if (
    directType === 'ADUBO' ||
    directType === 'RACAO' ||
    directType === 'SAL_MINERAL' ||
    directType === 'MEDICAMENTO' ||
    directType === 'SEMENTE' ||
    directType === 'DEFENSIVO' ||
    directType === 'OUTRO'
  ) {
    return directType;
  }

  const name = String(raw.name ?? '').toLowerCase();
  if (name.includes('adubo') || name.includes('fertiliz')) return 'ADUBO';
  if (name.includes('racao')) return 'RACAO';
  if (name.includes('sal mineral')) return 'SAL_MINERAL';
  return 'OUTRO';
};

const inferApplicationArea = (raw: Record<string, unknown>): ProducerApplicationArea => {
  const directArea = String(raw.applicationArea ?? '').toUpperCase();
  if (
    directArea === 'PASTAGEM' ||
    directArea === 'LAVOURA' ||
    directArea === 'CONFINAMENTO' ||
    directArea === 'AVIARIO' ||
    directArea === 'CURRAL' ||
    directArea === 'GERAL'
  ) {
    return directArea;
  }

  const inputType = inferInputType(raw);
  if (inputType === 'ADUBO' || inputType === 'SEMENTE' || inputType === 'DEFENSIVO') return 'LAVOURA';
  if (inputType === 'RACAO' || inputType === 'SAL_MINERAL') return 'CONFINAMENTO';
  return 'GERAL';
};

const inferTargetSpecies = (raw: Record<string, unknown>): ProducerTargetSpecies[] => {
  const species = Array.isArray(raw.targetSpecies) ? raw.targetSpecies : [];
  const normalized = species
    .map((entry) => String(entry).toUpperCase())
    .filter(
      (entry): entry is ProducerTargetSpecies =>
        entry === 'BOVINOS' ||
        entry === 'AVES' ||
        entry === 'SUINOS' ||
        entry === 'OVINOS' ||
        entry === 'CAPRINOS' ||
        entry === 'EQUINOS'
    );
  if (normalized.length > 0) {
    return normalized;
  }

  const name = String(raw.name ?? '').toLowerCase();
  if (name.includes('aves')) return ['AVES'];
  if (name.includes('bov')) return ['BOVINOS'];
  return [];
};

const toInput = (id: string, raw: Record<string, unknown>): ProducerInput => ({
  id,
  name: String(raw.name ?? ''),
  inputType: inferInputType(raw),
  applicationArea: inferApplicationArea(raw),
  targetSpecies: inferTargetSpecies(raw),
  unit: String(raw.unit ?? ''),
  unitCost: Number(raw.unitCost ?? 0),
  stock: Number(raw.stock ?? 0),
  createdAt: String(raw.createdAt ?? ''),
});

const inputTypesRequiringSpecies = new Set<ProducerInputType>(['RACAO', 'SAL_MINERAL', 'MEDICAMENTO']);

const isInputClassificationValid = (input: Omit<ProducerInput, 'id' | 'createdAt'>): boolean => {
  if (inputTypesRequiringSpecies.has(input.inputType) && input.targetSpecies.length === 0) {
    return false;
  }
  return true;
};

const toExpense = (id: string, raw: Record<string, unknown>): ProducerExpense => ({
  id,
  description: String(raw.description ?? ''),
  category: (raw.category as ProducerExpense['category']) ?? 'OUTROS',
  amount: Number(raw.amount ?? 0),
  date: String(raw.date ?? ''),
  source: (raw.source as ProducerExpense['source']) ?? 'SISTEMA',
  relatedActivityId: raw.relatedActivityId ? String(raw.relatedActivityId) : undefined,
  relatedPastureId: raw.relatedPastureId ? String(raw.relatedPastureId) : undefined,
  areaHa: raw.areaHa !== undefined && raw.areaHa !== null ? Number(raw.areaHa) : undefined,
  expectedRevenue: raw.expectedRevenue !== undefined && raw.expectedRevenue !== null ? Number(raw.expectedRevenue) : undefined,
  realizedRevenue: raw.realizedRevenue !== undefined && raw.realizedRevenue !== null ? Number(raw.realizedRevenue) : undefined,
  profit: raw.profit !== undefined && raw.profit !== null ? Number(raw.profit) : undefined,
});

const toActivity = (id: string, raw: Record<string, unknown>): ProducerOperationalActivity => ({
  id,
  title: String(raw.title ?? ''),
  details: String(raw.details ?? ''),
  actor: String(raw.actor ?? ''),
  actorRole: (raw.actorRole as ProducerOperationalActivity['actorRole']) ?? 'ADMINISTRADOR',
  date: String(raw.date ?? ''),
  relatedLotId: raw.relatedLotId ? String(raw.relatedLotId) : undefined,
});
const parseQuantity = (raw?: string): number => {
  if (!raw) return 0;
  const normalized = raw.replace(',', '.');
  const match = normalized.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

export const producerOpsService = {
  async listAnimalLots(): Promise<ProducerAnimalLot[]> {
    const snapshot = await getDocs(lotsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toLot(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProducerAnimalLot, b: ProducerAnimalLot) => a.name.localeCompare(b.name));
  },

  async createAnimalLot(payload: Omit<ProducerAnimalLot, 'id' | 'createdAt'>): Promise<ProducerAnimalLot> {
    const newLot: ProducerAnimalLot = {
      id: `LOT-${Date.now()}`,
      name: payload.name,
      category: payload.category,
      headcount: payload.headcount,
      averageWeightKg: payload.averageWeightKg,
      createdAt: new Date().toLocaleString('pt-BR'),
    };
    await setDoc(doc(db, 'producerAnimalLots', newLot.id), {
      ...newLot,
      createdAtTs: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newLot;
  },

  async listInputs(): Promise<ProducerInput[]> {
    const snapshot = await getDocs(inputsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toInput(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProducerInput, b: ProducerInput) => a.name.localeCompare(b.name));
  },

  async createInput(payload: Omit<ProducerInput, 'id' | 'createdAt'>): Promise<ProducerInput> {
    if (!isInputClassificationValid(payload)) {
      throw new Error('Classificacao de insumo invalida para o tipo informado.');
    }
    const newInput: ProducerInput = {
      id: `INP-${Date.now()}`,
      name: payload.name,
      inputType: payload.inputType,
      applicationArea: payload.applicationArea,
      targetSpecies: payload.targetSpecies,
      unit: payload.unit,
      unitCost: payload.unitCost,
      stock: payload.stock,
      createdAt: new Date().toLocaleString('pt-BR'),
    };
    await setDoc(doc(db, 'producerInputs', newInput.id), {
      ...newInput,
      createdAtTs: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newInput;
  },

  async listExpenses(): Promise<ProducerExpense[]> {
    const snapshot = await getDocs(expensesCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toExpense(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProducerExpense, b: ProducerExpense) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async createExpense(payload: Omit<ProducerExpense, 'id' | 'date'>): Promise<ProducerExpense> {
    const newExpense: ProducerExpense = {
      id: `EXP-${Date.now()}`,
      description: payload.description,
      category: payload.category,
      amount: payload.amount,
      date: new Date().toLocaleString('pt-BR'),
      source: payload.source,
      relatedActivityId: payload.relatedActivityId,
      relatedPastureId: payload.relatedPastureId,
      areaHa: payload.areaHa,
      expectedRevenue: payload.expectedRevenue,
      realizedRevenue: payload.realizedRevenue,
      profit: payload.profit,
    };
    await setDoc(doc(db, 'producerOperationalExpenses', newExpense.id), {
      ...newExpense,
      createdAtTs: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newExpense;
  },

  async listActivities(): Promise<ProducerOperationalActivity[]> {
    const snapshot = await getDocs(activitiesCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toActivity(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProducerOperationalActivity, b: ProducerOperationalActivity) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async createActivity(payload: Omit<ProducerOperationalActivity, 'id' | 'date'>): Promise<ProducerOperationalActivity> {
    const newActivity: ProducerOperationalActivity = {
      id: `ACT-${Date.now()}`,
      title: payload.title,
      details: payload.details,
      actor: payload.actor,
      actorRole: payload.actorRole,
      date: new Date().toLocaleString('pt-BR'),
      relatedLotId: payload.relatedLotId,
    };
    await setDoc(doc(db, 'producerOperationalActivities', newActivity.id), {
      ...newActivity,
      createdAtTs: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newActivity;
  },

  async registerRequestApprovalExpense(params: {
    requestId: string;
    item: string;
    quantity?: string;
    actor: string;
    role: ProducerOperationalActivity['actorRole'];
  }): Promise<void> {
    const [inputs] = await Promise.all([this.listInputs()]);
    const input = inputs.find((entry) => entry.name.toLowerCase() === params.item.toLowerCase());
    const quantity = parseQuantity(params.quantity);
    const estimatedAmount = input && quantity > 0 ? quantity * input.unitCost : 0;
    const classificationDetails = input
      ? ` | tipo=${input.inputType} | local=${input.applicationArea}${input.targetSpecies.length ? ` | especies=${input.targetSpecies.join(',')}` : ''}`
      : '';

    const activity = await this.createActivity({
      title: 'Solicitacao operacional aprovada',
      details: `${params.item} (${params.quantity ?? 'quantidade nao informada'})${classificationDetails}`,
      actor: params.actor,
      actorRole: params.role,
    });

    if (estimatedAmount > 0) {
      await this.createExpense({
        description: `Consumo aprovado: ${params.item}`,
        category: 'INSUMO',
        amount: estimatedAmount,
        source: params.role === 'OPERADOR' ? 'OPERADOR' : 'ADMINISTRADOR',
        relatedActivityId: activity.id,
      });
    }
  },

  async getKpis(): Promise<{
    totalAnimals: number;
    totalExpenses: number;
    costPerHead: number;
  }> {
    const [lots, expenses] = await Promise.all([this.listAnimalLots(), this.listExpenses()]);
    const totalAnimals = lots.reduce((sum, lot) => sum + lot.headcount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const costPerHead = totalAnimals > 0 ? totalExpenses / totalAnimals : 0;
    return { totalAnimals, totalExpenses, costPerHead };
  },
};
