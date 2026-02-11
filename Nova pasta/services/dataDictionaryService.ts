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

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(dataDictionaryCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    dataDictionaryEntities.map((entity) =>
      setDoc(doc(db, 'dataDictionaryEntities', entity.name), {
        ...entity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

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
    return snapshot.docs.map((docSnapshot) =>
      toDataEntity(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
