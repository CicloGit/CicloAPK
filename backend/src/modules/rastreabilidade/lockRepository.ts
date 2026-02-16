import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDatabase } from '../../shared/firebaseAdmin';

export interface LockData {
  id: string;
  farmId: string;
  localId: string;
  reason: string;
  active: boolean;
  deltaHeads: number;
}

export async function getActiveLockByLocal(farmId: string, localId: string): Promise<LockData | null> {
  const snapshot = await firestoreDatabase
    .collection(`farms/${farmId}/locks`)
    .where('localId', '==', localId)
    .where('active', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    farmId,
    localId,
    reason: String(doc.get('reason') ?? ''),
    active: Boolean(doc.get('active')),
    deltaHeads: Number(doc.get('deltaHeads') ?? 0),
  };
}

export async function applyLocalLock(params: {
  farmId: string;
  localId: string;
  reason: string;
  deltaHeads: number;
}): Promise<void> {
  const existingLock = await getActiveLockByLocal(params.farmId, params.localId);
  if (existingLock) {
    return;
  }

  const lockReference = firestoreDatabase.collection(`farms/${params.farmId}/locks`).doc();
  await lockReference.set({
    id: lockReference.id,
    localId: params.localId,
    reason: params.reason,
    deltaHeads: params.deltaHeads,
    active: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function removeLocalLock(farmId: string, localId: string): Promise<void> {
  const existingLock = await getActiveLockByLocal(farmId, localId);
  if (!existingLock) {
    return;
  }

  await firestoreDatabase.collection(`farms/${farmId}/locks`).doc(existingLock.id).set(
    {
      active: false,
      releasedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
