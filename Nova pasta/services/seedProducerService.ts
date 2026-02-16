import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CertificationStep, SeedField, SeedLot } from '../types';

const seedFieldsCollection = collection(db, 'seedFields');
const seedLotsCollection = collection(db, 'seedLots');
const certificationCollection = collection(db, 'seedCertifications');

const toSeedField = (id: string, raw: Record<string, unknown>): SeedField => ({
  id,
  name: String(raw.name ?? ''),
  variety: String(raw.variety ?? ''),
  generation: (raw.generation as SeedField['generation']) ?? 'C1',
  area: Number(raw.area ?? 0),
  status: (raw.status as SeedField['status']) ?? 'PREPARO',
  expectedYield: Number(raw.expectedYield ?? 0),
});

const toSeedLot = (id: string, raw: Record<string, unknown>): SeedLot => ({
  id,
  fieldId: String(raw.fieldId ?? ''),
  variety: String(raw.variety ?? ''),
  generation: (raw.generation as SeedLot['generation']) ?? 'C1',
  quantity: Number(raw.quantity ?? 0),
  germinationRate: Number(raw.germinationRate ?? 0),
  purity: Number(raw.purity ?? 0),
  storageLocation: String(raw.storageLocation ?? ''),
});

const toCertificationStep = (id: string, raw: Record<string, unknown>): CertificationStep => ({
  name: String(raw.name ?? ''),
  status: (raw.status as CertificationStep['status']) ?? 'PENDENTE',
  date: raw.date ? String(raw.date) : undefined,
});


export const seedProducerService = {
  async listSeedFields(): Promise<SeedField[]> {
    const snapshot = await getDocs(seedFieldsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toSeedField(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listSeedLots(): Promise<SeedLot[]> {
    const snapshot = await getDocs(seedLotsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toSeedLot(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listCertificationSteps(): Promise<CertificationStep[]> {
    const snapshot = await getDocs(certificationCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toCertificationStep(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};
