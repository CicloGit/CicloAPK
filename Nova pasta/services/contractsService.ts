import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { parseDateToTimestamp } from './dateUtils';
import { Contract } from '../types';

const contractsCollection = collection(db, 'contracts');

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


export const contractsService = {
  async listContracts(): Promise<Contract[]> {
    const snapshot = await getDocs(contractsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toContract(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: Contract, b: Contract) => parseDateToTimestamp(a.deadline) - parseDateToTimestamp(b.deadline));
  },
};
