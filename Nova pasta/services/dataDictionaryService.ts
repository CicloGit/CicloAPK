import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { dataDictionaryEntities } from '../constants';
import { db } from '../config/firebase';
import { DataEntity } from '../types';

const dataDictionaryCollection = collection(db, 'dataDictionaryEntities');

let seeded = false;


const toDataEntity = (id: string, raw: Record<string, unknown>): DataEntity => ({
  name: String(raw.name ?? id),
  description: String(raw.description ?? ''),
  fields: Array.isArray(raw.fields) ? raw.fields.map(String) : [],
});

export const dataDictionaryService = {
  async listEntities(): Promise<DataEntity[]> {
    const snapshot = await getDocs(dataDictionaryCollection);
    return snapshot.docs.map((docSnapshot: any) =>
      toDataEntity(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
