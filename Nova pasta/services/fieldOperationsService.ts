import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

export interface FieldDiaryEntry {
  id: string;
  tenantId?: string;
  propertyId?: string;
  propertyName?: string;
  producerId?: string;
  producerName?: string;
  operatorUserId?: string;
  author: string;
  role: string;
  date: string;
  location: string;
  type: 'AUDIO' | 'PHOTO';
  transcript: string;
  aiAction?: string;
}

const diaryCollection = collection(db, 'fieldDiaryEntries');
const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const isOperatorRole = (role: string): boolean => role === 'Operador';

interface DiaryScope {
  userId: string;
  tenantId: string;
  role: string;
  displayName?: string;
  linkedPropertyId?: string;
  linkedPropertyName?: string;
  linkedProducerId?: string;
  linkedProducerName?: string;
}

const resolveDiaryScope = async (): Promise<DiaryScope> => {
  const context = await resolveTenantContext();
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('Usuario nao autenticado.');
  }

  const snapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
  const raw = snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : {};

  return {
    userId: context.userId,
    tenantId: context.tenantId,
    role: normalizeText(raw.role) || 'Operador',
    displayName: normalizeText(raw.name) || undefined,
    linkedPropertyId: normalizeText(raw.linkedPropertyId) || undefined,
    linkedPropertyName: normalizeText(raw.linkedPropertyName) || undefined,
    linkedProducerId: normalizeText(raw.linkedProducerId) || undefined,
    linkedProducerName: normalizeText(raw.linkedProducerName) || undefined,
  };
};

const toDiaryEntry = (id: string, raw: Record<string, unknown>): FieldDiaryEntry => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
  propertyName: raw.propertyName ? String(raw.propertyName) : undefined,
  producerId: raw.producerId ? String(raw.producerId) : undefined,
  producerName: raw.producerName ? String(raw.producerName) : undefined,
  operatorUserId: raw.operatorUserId ? String(raw.operatorUserId) : undefined,
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
    const scope = await resolveDiaryScope();
    const snapshot = await getDocs(query(diaryCollection, where('tenantId', '==', scope.tenantId)));
    if (isOperatorRole(scope.role) && (!scope.linkedPropertyId || !scope.linkedProducerId)) {
      throw new Error(
        'Operador sem vinculo de fazenda/produtor. Solicite ao produtor responsavel o cadastro correto do acesso.'
      );
    }

    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, entry: toDiaryEntry(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, scope))
      .map((item: { entry: FieldDiaryEntry }) => item.entry)
      .filter((entry: FieldDiaryEntry) => {
        if (!isOperatorRole(scope.role)) {
          return true;
        }
        return (
          entry.operatorUserId === scope.userId ||
          (Boolean(scope.linkedPropertyId) && entry.propertyId === scope.linkedPropertyId)
        );
      });
  },

  async createDiaryEntry(payload: Omit<FieldDiaryEntry, 'id' | 'date'>): Promise<FieldDiaryEntry> {
    const scope = await resolveDiaryScope();
    const writingAsOperator = isOperatorRole(scope.role);
    if (writingAsOperator && (!scope.linkedPropertyId || !scope.linkedProducerId)) {
      throw new Error(
        'Operador sem vinculo de fazenda/produtor. Solicite ao produtor responsavel o cadastro correto do acesso.'
      );
    }

    const propertyId = writingAsOperator ? scope.linkedPropertyId : normalizeText(payload.propertyId) || undefined;
    const propertyName = writingAsOperator
      ? scope.linkedPropertyName || normalizeText(payload.propertyName) || undefined
      : normalizeText(payload.propertyName) || undefined;
    const producerId = writingAsOperator ? scope.linkedProducerId : normalizeText(payload.producerId) || undefined;
    const producerName = writingAsOperator
      ? scope.linkedProducerName || normalizeText(payload.producerName) || undefined
      : normalizeText(payload.producerName) || undefined;

    const newEntry: FieldDiaryEntry = {
      id: `FD-${Date.now()}`,
      tenantId: scope.tenantId,
      propertyId,
      propertyName,
      producerId,
      producerName,
      operatorUserId: writingAsOperator ? scope.userId : payload.operatorUserId,
      author: normalizeText(payload.author) || scope.displayName || 'Operador',
      role: payload.role,
      date: new Date().toLocaleString('pt-BR'),
      location: normalizeText(payload.location) || propertyName || 'Sem local definido',
      type: payload.type,
      transcript: payload.transcript,
      aiAction: payload.aiAction,
    };

    await setDoc(
      doc(db, 'fieldDiaryEntries', newEntry.id),
      withTenantFields(
        {
          ...newEntry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        scope
      ),
      { merge: true }
    );

    return newEntry;
  },
};
