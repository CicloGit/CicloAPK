import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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
