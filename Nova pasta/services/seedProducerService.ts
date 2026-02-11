import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockCertificationProcess, mockSeedFields, mockSeedLots } from '../constants';
import { db } from '../config/firebase';
import { CertificationStep, SeedField, SeedLot } from '../types';

const seedFieldsCollection = collection(db, 'seedFields');
const seedLotsCollection = collection(db, 'seedLots');
const certificationCollection = collection(db, 'seedCertifications');

let seeded = false;

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

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(seedFieldsCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockSeedFields.map((field) =>
      setDoc(doc(db, 'seedFields', field.id), {
        ...field,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockSeedLots.map((lot) =>
      setDoc(doc(db, 'seedLots', lot.id), {
        ...lot,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockCertificationProcess.map((step, index) =>
      setDoc(doc(db, 'seedCertifications', `STEP-${index + 1}`), {
        ...step,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const seedProducerService = {
  async listSeedFields(): Promise<SeedField[]> {
    await ensureSeedData();
    const snapshot = await getDocs(seedFieldsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toSeedField(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listSeedLots(): Promise<SeedLot[]> {
    await ensureSeedData();
    const snapshot = await getDocs(seedLotsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toSeedLot(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listCertificationSteps(): Promise<CertificationStep[]> {
    await ensureSeedData();
    const snapshot = await getDocs(certificationCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toCertificationStep(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};
