import { collection, getDocs } from 'firebase/firestore';
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
export const technicianService = {
  async listKpis(): Promise<TechnicianKpi[]> {
    const snapshot = await getDocs(kpiCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toKpi(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listReports(): Promise<TechnicianReportItem[]> {
    const snapshot = await getDocs(reportCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toReport(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};



