import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toDataDictionaryEntities } from '../config/operationsCatalog';
import { DataEntity } from '../types';

const dataDictionaryCollection = collection(db, 'dataDictionaryEntities');
const toDataEntity = (id: string, raw: Record<string, unknown>): DataEntity => ({
  name: String(raw.name ?? id),
  description: String(raw.description ?? ''),
  fields: Array.isArray(raw.fields) ? raw.fields.map(String) : [],
});

export const dataDictionaryService = {
  async listEntities(): Promise<DataEntity[]> {
    const snapshot = await getDocs(dataDictionaryCollection);
    const remoteEntities = snapshot.docs.map((docSnapshot: any) =>
      toDataEntity(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
    const catalogEntities = toDataDictionaryEntities();

    if (remoteEntities.length === 0) {
      return catalogEntities;
    }

    const merged = new Map<string, DataEntity>();
    [...remoteEntities, ...catalogEntities].forEach((entity) => {
      merged.set(entity.name, entity);
    });

    return Array.from(merged.values());
  },
};

