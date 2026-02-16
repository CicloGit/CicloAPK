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

export interface ManagerKpi {
  id: string;
  label: string;
  value: string;
  color: string;
  icon: 'projects' | 'escrow' | 'users';
}

export interface ManagerActivity {
  id: string;
  label: string;
  description: string;
  severity: 'ALERTA' | 'LOCK' | 'CONTRATO';
}

let seeded = false;

const kpiCollection = collection(db, 'managerKpis');
const activityCollection = collection(db, 'managerActivities');

const seedKpis: ManagerKpi[] = [
  { id: 'MGR-KPI-1', label: 'Projetos Ativos', value: '84', color: 'text-indigo-700', icon: 'projects' },
  { id: 'MGR-KPI-2', label: 'Valor em Escrow', value: 'R$ 1.2M', color: 'text-green-700', icon: 'escrow' },
  { id: 'MGR-KPI-3', label: 'Usuarios Ativos', value: '215', color: 'text-sky-700', icon: 'users' },
];

const seedActivities: ManagerActivity[] = [
  { id: 'MGR-ACT-1', label: 'ALERTA DE PERDA', description: 'Perda critica de insumos registrada por Julia Martins', severity: 'ALERTA' },
  { id: 'MGR-ACT-2', label: 'LOCK APLICADO', description: 'Bloqueio de CAR aplicado ao Produtor Fazenda Sol Nascente', severity: 'LOCK' },
  { id: 'MGR-ACT-3', label: 'CONTRATO', description: 'Novo contrato de R$ 250.000,00 aguardando assinatura', severity: 'CONTRATO' },
];

const toKpi = (id: string, raw: Record<string, unknown>): ManagerKpi => ({
  id,
  label: String(raw.label ?? ''),
  value: String(raw.value ?? ''),
  color: String(raw.color ?? 'text-indigo-700'),
  icon: (raw.icon as ManagerKpi['icon']) ?? 'projects',
});

const toActivity = (id: string, raw: Record<string, unknown>): ManagerActivity => ({
  id,
  label: String(raw.label ?? ''),
  description: String(raw.description ?? ''),
  severity: (raw.severity as ManagerActivity['severity']) ?? 'ALERTA',
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  seeded = true;
}


export const managerService = {
  async listKpis(): Promise<ManagerKpi[]> {
    await ensureSeedData();
    const snapshot = await getDocs(kpiCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toKpi(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listActivities(): Promise<ManagerActivity[]> {
    await ensureSeedData();
    const snapshot = await getDocs(activityCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toActivity(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};
