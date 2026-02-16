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

const seedContracts: LegalContract[] = [
  {
    id: 'CONTR-001',
    title: 'Contrato de Fornecimento Insumos',
    counterpart: 'AgroFertil SA',
    status: 'ATIVO',
    signedAt: '2024-03-10',
    expiresAt: '2026-03-10',
  },
  {
    id: 'CONTR-002',
    title: 'Contrato Venda Safra Soja',
    counterpart: 'Cargill',
    status: 'PENDENTE',
    signedAt: '2024-06-01',
    expiresAt: '2025-06-01',
  },
];

const seedLicenses: LegalLicense[] = [
  {
    id: 'LIC-001',
    name: 'Licenca Ambiental Operacao',
    agency: 'SEMA',
    status: 'VALIDA',
    expiresAt: '2026-12-20',
  },
  {
    id: 'LIC-002',
    name: 'Cadastro Ambiental Rural (CAR)',
    agency: 'IBAMA',
    status: 'EM_RENOVACAO',
    expiresAt: '2025-08-01',
  },
];

const seedAlerts: LegalComplianceAlert[] = [
  {
    id: 'COMP-001',
    title: 'Auditoria de estoque regulatorio pendente',
    severity: 'MEDIA',
    dueDate: '2025-02-15',
    status: 'ABERTO',
  },
  {
    id: 'COMP-002',
    title: 'Atualizacao de licenca ambiental',
    severity: 'ALTA',
    dueDate: '2025-01-30',
    status: 'RESOLVIDO',
  },
];

let seeded = false;

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  seeded = true;
}


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
    await ensureSeedData();
    const snapshot = await getDocs(contractsCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toContract(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },

  async listLicenses(): Promise<LegalLicense[]> {
    await ensureSeedData();
    const snapshot = await getDocs(licensesCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toLicense(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },

  async listComplianceAlerts(): Promise<LegalComplianceAlert[]> {
    await ensureSeedData();
    const snapshot = await getDocs(complianceCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toAlert(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
