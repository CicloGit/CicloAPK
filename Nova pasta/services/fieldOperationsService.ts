import {
  collection,
  doc,
  getDocs,
  limit,
  query,
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
let seeded = false;

const seedEntries: FieldDiaryEntry[] = [
  {
    id: 'FD-001',
    author: 'Jose da Silva',
    role: 'Capataz',
    date: 'Hoje, 08:30',
    location: 'Pasto 03',
    type: 'AUDIO',
    transcript:
      'Vacinei o gado do pasto 3 conforme solicitado. Notei que o bebedouro proximo a cerca norte esta com vazamento leve, precisa de reparo amanha.',
    aiAction: 'Tarefa de Reparo Criada',
  },
  {
    id: 'FD-002',
    author: 'Marcos Oliveira',
    role: 'Operador',
    date: 'Ontem, 16:45',
    location: 'Galpao',
    type: 'PHOTO',
    transcript: 'Contagem final de sacas de milho: 45 unidades. Racao concentrada: 12 sacas.',
  },
];

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

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(diaryCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    seedEntries.map((entry) =>
      setDoc(doc(db, 'fieldDiaryEntries', entry.id), {
        ...entry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const fieldOperationsService = {
  async listDiaryEntries(): Promise<FieldDiaryEntry[]> {
    await ensureSeedData();
    const snapshot = await getDocs(diaryCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toDiaryEntry(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },
};
