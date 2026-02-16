import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDatabase } from '../../shared/firebaseAdmin';

export async function createLocal(
  farmId: string,
  payload: {
    name: string;
    type: 'LOTE' | 'PASTO';
    capacityHeads: number;
    areaHa?: number;
    status: 'ATIVO' | 'INATIVO';
  },
): Promise<{ id: string }> {
  const localReference = firestoreDatabase.collection(`farms/${farmId}/locals`).doc();
  await localReference.set({
    id: localReference.id,
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: localReference.id };
}
