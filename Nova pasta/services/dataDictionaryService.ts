import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DataEntity } from '../types';

const dataDictionaryCollection = collection(db, 'dataDictionaryEntities');

let seeded = false;

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  seeded = true;
}



const toDataEntity = (id: string, raw: Record<string, unknown>): DataEntity => ({
  name: String(raw.name ?? id),
  description: String(raw.description ?? ''),
  fields: Array.isArray(raw.fields) ? raw.fields.map(String) : [],
});

export const dataDictionaryService = {
  async listEntities(): Promise<DataEntity[]> {
    await ensureSeedData();
    const snapshot = await getDocs(dataDictionaryCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toDataEntity(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
