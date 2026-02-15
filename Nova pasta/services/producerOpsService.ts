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
  ProducerAnimalLot,
  ProducerExpense,
  ProducerInput,
  ProducerOperationalActivity,
} from '../types';
import { parseDateToTimestamp } from './dateUtils';

const lotsCollection = collection(db, 'producerAnimalLots');
const inputsCollection = collection(db, 'producerInputs');
const expensesCollection = collection(db, 'producerOperationalExpenses');
const activitiesCollection = collection(db, 'producerOperationalActivities');

let seeded = false;

const toLot = (id: string, raw: Record<string, unknown>): ProducerAnimalLot => ({
  id,
  name: String(raw.name ?? ''),
  category: String(raw.category ?? ''),
  headcount: Number(raw.headcount ?? 0),
  averageWeightKg: Number(raw.averageWeightKg ?? 0),
  createdAt: String(raw.createdAt ?? ''),
});

const toInput = (id: string, raw: Record<string, unknown>): ProducerInput => ({
  id,
  name: String(raw.name ?? ''),
  unit: String(raw.unit ?? ''),
  unitCost: Number(raw.unitCost ?? 0),
  stock: Number(raw.stock ?? 0),
  createdAt: String(raw.createdAt ?? ''),
});

const toExpense = (id: string, raw: Record<string, unknown>): ProducerExpense => ({
  id,
  description: String(raw.description ?? ''),
  category: (raw.category as ProducerExpense['category']) ?? 'OUTROS',
  amount: Number(raw.amount ?? 0),
  date: String(raw.date ?? ''),
  source: (raw.source as ProducerExpense['source']) ?? 'SISTEMA',
  relatedActivityId: raw.relatedActivityId ? String(raw.relatedActivityId) : undefined,
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

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(lotsCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  const now = new Date().toLocaleString('pt-BR');
  const seedLots: ProducerAnimalLot[] = [
    { id: 'LOT-001', name: 'Lote A - Recria', category: 'Recria', headcount: 120, averageWeightKg: 320, createdAt: now },
  ];
  const seedInputs: ProducerInput[] = [
    { id: 'INP-001', name: 'Racao Crescimento', unit: 'kg', unitCost: 2.2, stock: 1200, createdAt: now },
    { id: 'INP-002', name: 'Sal Mineral 80', unit: 'kg', unitCost: 4.25, stock: 240, createdAt: now },
  ];

  await Promise.all(
    seedLots.map((lot) =>
      setDoc(doc(db, 'producerAnimalLots', lot.id), {
        ...lot,
        createdAtTs: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    seedInputs.map((input) =>
      setDoc(doc(db, 'producerInputs', input.id), {
        ...input,
        createdAtTs: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

const parseQuantity = (raw?: string): number => {
  if (!raw) return 0;
  const normalized = raw.replace(',', '.');
  const match = normalized.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

export const producerOpsService = {
  async listAnimalLots(): Promise<ProducerAnimalLot[]> {
    await ensureSeedData();
    const snapshot = await getDocs(lotsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toLot(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProducerAnimalLot, b: ProducerAnimalLot) => a.name.localeCompare(b.name));
  },

  async createAnimalLot(payload: Omit<ProducerAnimalLot, 'id' | 'createdAt'>): Promise<ProducerAnimalLot> {
    await ensureSeedData();
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
    await ensureSeedData();
    const snapshot = await getDocs(inputsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toInput(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProducerInput, b: ProducerInput) => a.name.localeCompare(b.name));
  },

  async createInput(payload: Omit<ProducerInput, 'id' | 'createdAt'>): Promise<ProducerInput> {
    await ensureSeedData();
    const newInput: ProducerInput = {
      id: `INP-${Date.now()}`,
      name: payload.name,
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
    await ensureSeedData();
    const snapshot = await getDocs(expensesCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toExpense(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProducerExpense, b: ProducerExpense) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async createExpense(payload: Omit<ProducerExpense, 'id' | 'date'>): Promise<ProducerExpense> {
    await ensureSeedData();
    const newExpense: ProducerExpense = {
      id: `EXP-${Date.now()}`,
      description: payload.description,
      category: payload.category,
      amount: payload.amount,
      date: new Date().toLocaleString('pt-BR'),
      source: payload.source,
      relatedActivityId: payload.relatedActivityId,
    };
    await setDoc(doc(db, 'producerOperationalExpenses', newExpense.id), {
      ...newExpense,
      createdAtTs: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newExpense;
  },

  async listActivities(): Promise<ProducerOperationalActivity[]> {
    await ensureSeedData();
    const snapshot = await getDocs(activitiesCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toActivity(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProducerOperationalActivity, b: ProducerOperationalActivity) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async createActivity(payload: Omit<ProducerOperationalActivity, 'id' | 'date'>): Promise<ProducerOperationalActivity> {
    await ensureSeedData();
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
    await ensureSeedData();
    const [inputs] = await Promise.all([this.listInputs()]);
    const input = inputs.find((entry) => entry.name.toLowerCase() === params.item.toLowerCase());
    const quantity = parseQuantity(params.quantity);
    const estimatedAmount = input && quantity > 0 ? quantity * input.unitCost : 0;

    const activity = await this.createActivity({
      title: 'Solicitacao operacional aprovada',
      details: `${params.item} (${params.quantity ?? 'quantidade nao informada'})`,
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
