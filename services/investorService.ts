import { collection, getDocs } from 'firebase/firestore';
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
const kpiCollection = collection(db, 'investorKpis');
const projectsCollection = collection(db, 'investorProjects');

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
export const investorService = {
  async listKpis(): Promise<InvestorKpi[]> {
    const snapshot = await getDocs(kpiCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toKpi(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listProjects(): Promise<InvestorProject[]> {
    const snapshot = await getDocs(projectsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};



