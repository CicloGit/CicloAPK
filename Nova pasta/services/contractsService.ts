import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockAnimalDetails } from '../constants';
import { db } from '../config/firebase';
import { parseDateToTimestamp } from './dateUtils';
import { AnimalProductionDetails, Contract } from '../types';

const contractsCollection = collection(db, 'contracts');

let seeded = false;

const toContract = (id: string, raw: Record<string, unknown>): Contract => ({
  id,
  description: String(raw.description ?? ''),
  value: Number(raw.value ?? 0),
  deadline: String(raw.deadline ?? ''),
  status: (raw.status as Contract['status']) ?? 'VIGENTE',
  deliveryHistory: Array.isArray(raw.deliveryHistory)
    ? (raw.deliveryHistory as Array<Record<string, unknown>>).map((item) => ({
        date: String(item.date ?? ''),
        quantity: String(item.quantity ?? ''),
      }))
    : [],
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(contractsCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  const contracts = (Object.values(mockAnimalDetails) as AnimalProductionDetails[]).flatMap((detail) =>
    detail.contracts.map((contract) => ({
      ...contract,
      projectId: detail.projectId,
    }))
  );

  await Promise.all(
    contracts.map((contract) =>
      setDoc(doc(db, 'contracts', contract.id), {
        ...contract,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const contractsService = {
  async listContracts(): Promise<Contract[]> {
    await ensureSeedData();
    const snapshot = await getDocs(contractsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toContract(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: Contract, b: Contract) => parseDateToTimestamp(a.deadline) - parseDateToTimestamp(b.deadline));
  },
};
