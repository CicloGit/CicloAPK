import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface FieldDiaryEntry {
  id: string;
  author: string;
  role: string;
  date: string;
  location: string;
  type: 'AUDIO' | 'PHOTO';
  transcript: string;
  aiAction?: string;
}

const diaryCollection = collection(db, 'fieldDiaryEntries');
const toDiaryEntry = (id: string, raw: Record<string, unknown>): FieldDiaryEntry => ({
  id,
  author: String(raw.author ?? ''),
  role: String(raw.role ?? ''),
  date: String(raw.date ?? ''),
  location: String(raw.location ?? ''),
  type: (raw.type as FieldDiaryEntry['type']) ?? 'AUDIO',
  transcript: String(raw.transcript ?? ''),
  aiAction: raw.aiAction ? String(raw.aiAction) : undefined,
});
export const fieldOperationsService = {
  async listDiaryEntries(): Promise<FieldDiaryEntry[]> {
    const snapshot = await getDocs(diaryCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toDiaryEntry(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async createDiaryEntry(payload: Omit<FieldDiaryEntry, 'id' | 'date'>): Promise<FieldDiaryEntry> {
    const newEntry: FieldDiaryEntry = {
      id: `FD-${Date.now()}`,
      author: payload.author,
      role: payload.role,
      date: new Date().toLocaleString('pt-BR'),
      location: payload.location,
      type: payload.type,
      transcript: payload.transcript,
      aiAction: payload.aiAction,
    };

    await setDoc(doc(db, 'fieldDiaryEntries', newEntry.id), {
      ...newEntry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newEntry;
  },
};


