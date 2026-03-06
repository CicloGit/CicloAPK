import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { resolveTenantContext } from './tenantContext';

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
const kpiCollection = collection(db, 'managerKpis');
const activityCollection = collection(db, 'managerActivities');


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
export const managerService = {
  async listKpis(): Promise<ManagerKpi[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(kpiCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => toKpi(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listActivities(): Promise<ManagerActivity[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(activityCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => toActivity(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};


