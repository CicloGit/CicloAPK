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
}

let seeded = false;

const kpiCollection = collection(db, 'investorKpis');
const projectsCollection = collection(db, 'investorProjects');

const seedKpis: InvestorKpi[] = [
  { id: 'INV-KPI-1', label: 'Total Investido', value: 'R$ 850K', color: 'text-indigo-600', icon: 'library' },
  { id: 'INV-KPI-2', label: 'Retorno Acumulado', value: 'R$ 125K', color: 'text-green-600', icon: 'cash' },
  { id: 'INV-KPI-3', label: 'ROI Medio', value: '14.7%', color: 'text-emerald-600', icon: 'trend' },
  { id: 'INV-KPI-4', label: 'Oportunidades', value: '6', color: 'text-sky-600', icon: 'briefcase' },
];

const seedProjects: InvestorProject[] = [
  { id: 'INV-PRJ-1', name: 'Safra Soja 2024', invested: 'R$ 200.000', status: 'Ativo', expectedReturn: '18%' },
  { id: 'INV-PRJ-2', name: 'Pecuaria Intensiva', invested: 'R$ 350.000', status: 'Ativo', expectedReturn: '12%' },
  { id: 'INV-PRJ-3', name: 'Credito Insumos', invested: 'R$ 300.000', status: 'Concluido', expectedReturn: '15.2% (real)' },
];

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
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(kpiCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    seedKpis.map((kpi) =>
      setDoc(doc(db, 'investorKpis', kpi.id), {
        ...kpi,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    seedProjects.map((project) =>
      setDoc(doc(db, 'investorProjects', project.id), {
        ...project,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const investorService = {
  async listKpis(): Promise<InvestorKpi[]> {
    await ensureSeedData();
    const snapshot = await getDocs(kpiCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toKpi(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listProjects(): Promise<InvestorProject[]> {
    await ensureSeedData();
    const snapshot = await getDocs(projectsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};
