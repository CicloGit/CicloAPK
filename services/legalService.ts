import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface LegalContract {
  id: string;
  title: string;
  counterpart: string;
  status: 'ATIVO' | 'PENDENTE' | 'ENCERRADO';
  signedAt: string;
  expiresAt: string;
}

export interface LegalLicense {
  id: string;
  name: string;
  agency: string;
  status: 'VALIDA' | 'EM_RENOVACAO' | 'VENCIDA';
  expiresAt: string;
}

export interface LegalComplianceAlert {
  id: string;
  title: string;
  severity: 'BAIXA' | 'MEDIA' | 'ALTA';
  dueDate: string;
  status: 'ABERTO' | 'RESOLVIDO';
}

const contractsCollection = collection(db, 'legalContracts');
const licensesCollection = collection(db, 'legalLicenses');
const complianceCollection = collection(db, 'legalComplianceAlerts');

const toContract = (id: string, raw: Record<string, unknown>): LegalContract => ({
  id,
  title: String(raw.title ?? ''),
  counterpart: String(raw.counterpart ?? ''),
  status: (raw.status as LegalContract['status']) ?? 'ATIVO',
  signedAt: String(raw.signedAt ?? ''),
  expiresAt: String(raw.expiresAt ?? ''),
});

const toLicense = (id: string, raw: Record<string, unknown>): LegalLicense => ({
  id,
  name: String(raw.name ?? ''),
  agency: String(raw.agency ?? ''),
  status: (raw.status as LegalLicense['status']) ?? 'VALIDA',
  expiresAt: String(raw.expiresAt ?? ''),
});

const toAlert = (id: string, raw: Record<string, unknown>): LegalComplianceAlert => ({
  id,
  title: String(raw.title ?? ''),
  severity: (raw.severity as LegalComplianceAlert['severity']) ?? 'MEDIA',
  dueDate: String(raw.dueDate ?? ''),
  status: (raw.status as LegalComplianceAlert['status']) ?? 'ABERTO',
});

export const legalService = {
  async listContracts(): Promise<LegalContract[]> {
    const snapshot = await getDocs(contractsCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toContract(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },

  async listLicenses(): Promise<LegalLicense[]> {
    const snapshot = await getDocs(licensesCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toLicense(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },

  async listComplianceAlerts(): Promise<LegalComplianceAlert[]> {
    const snapshot = await getDocs(complianceCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toAlert(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};



