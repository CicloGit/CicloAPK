import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDatabase } from '../../shared/firebaseAdmin';

export async function createFarm(payload: {
  name: string;
  code: string;
  city: string;
  state: string;
}) {
  const farmReference = firestoreDatabase.collection('farms').doc();
  const farm = {
    id: farmReference.id,
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await farmReference.set(farm);
  return { id: farmReference.id, ...payload };
}

export async function registerGenericCadastro(
  farmId: string,
  cadastroType: string,
  data: Record<string, unknown>,
): Promise<{ id: string }> {
  const reference = firestoreDatabase.collection(`farms/${farmId}/${cadastroType}`).doc();
  await reference.set({
    id: reference.id,
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: reference.id };
}
