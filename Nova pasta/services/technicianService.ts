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

export interface TechnicianKpi {
  id: string;
  label: string;
  value: string;
}

export interface TechnicianReportItem {
  id: string;
  title: string;
  location: string;
  dateLabel: string;
}

const kpiCollection = collection(db, 'technicianKpis');
const reportCollection = collection(db, 'technicianReports');

let seeded = false;

const seedKpis: TechnicianKpi[] = [
  { id: 'TECH-KPI-1', label: 'Produtores Atendidos', value: '28' },
  { id: 'TECH-KPI-2', label: 'Projetos em Andamento', value: '15' },
  { id: 'TECH-KPI-3', label: 'Visitas Agendadas', value: '4' },
  { id: 'TECH-KPI-4', label: 'Laudos Pendentes', value: '2' },
];

const seedReports: TechnicianReportItem[] = [
  { id: 'TECH-REP-1', title: 'Relatorio de Visita', location: 'Fazenda Boa Esperanca', dateLabel: '2d atras' },
  { id: 'TECH-REP-2', title: 'Cadastro de Lote', location: 'Sitio Santo Antonio', dateLabel: '5d atras' },
  { id: 'TECH-REP-3', title: 'Laudo Sanitario', location: 'Fazenda Agua Limpa', dateLabel: '1sem atras' },
];

const toKpi = (id: string, raw: Record<string, unknown>): TechnicianKpi => ({
  id,
  label: String(raw.label ?? ''),
  value: String(raw.value ?? ''),
});

const toReport = (id: string, raw: Record<string, unknown>): TechnicianReportItem => ({
  id,
  title: String(raw.title ?? ''),
  location: String(raw.location ?? ''),
  dateLabel: String(raw.dateLabel ?? ''),
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  seeded = true;
}


export const technicianService = {
  async listKpis(): Promise<TechnicianKpi[]> {
    await ensureSeedData();
    const snapshot = await getDocs(kpiCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toKpi(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listReports(): Promise<TechnicianReportItem[]> {
    await ensureSeedData();
    const snapshot = await getDocs(reportCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toReport(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};
