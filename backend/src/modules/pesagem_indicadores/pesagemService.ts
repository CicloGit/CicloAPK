import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDatabase } from '../../shared/firebaseAdmin';
import { assertLocalWithoutActiveLock } from '../rastreabilidade/lockGuard';
import { validateEvidences } from '../evidencias/evidencePolicyService';
import { emitEvent } from '../../shared/eventBus';
import { AuthenticatedUser } from '../../shared/auth/types';

function daysBetweenDates(startDateIso: string, endDateIso: string): number {
  const startDate = new Date(startDateIso);
  const endDate = new Date(endDateIso);
  const differenceMilliseconds = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.round(differenceMilliseconds / (1000 * 60 * 60 * 24)));
}

async function calculateAnimalGmd(
  farmId: string,
  animalId: string,
  weighingDate: string,
  weightKg: number,
): Promise<number | null> {
  const snapshot = await firestoreDatabase
    .collection(`farms/${farmId}/weighings`)
    .where('animalId', '==', animalId)
    .orderBy('weighingDate', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const previousWeight = Number(snapshot.docs[0].get('weightKg') ?? 0);
  const previousDate = String(snapshot.docs[0].get('weighingDate') ?? weighingDate);
  const days = daysBetweenDates(previousDate, weighingDate);
  return Number(((weightKg - previousWeight) / days).toFixed(4));
}

async function calculateLotationIndicators(farmId: string, localId: string): Promise<{ headsPerHa: number | null; kgPvPerHa: number | null }> {
  const localSnapshot = await firestoreDatabase.collection(`farms/${farmId}/locals`).doc(localId).get();
  const areaHa = Number(localSnapshot.get('areaHa') ?? 0);

  if (!areaHa || areaHa <= 0) {
    return { headsPerHa: null, kgPvPerHa: null };
  }

  const animalSnapshot = await firestoreDatabase
    .collection(`farms/${farmId}/animals`)
    .where('currentLocalId', '==', localId)
    .where('status', '==', 'ATIVO')
    .get();

  const totalHeads = animalSnapshot.size;
  let totalWeight = 0;
  animalSnapshot.forEach((doc) => {
    totalWeight += Number(doc.get('weightKg') ?? 0);
  });

  return {
    headsPerHa: Number((totalHeads / areaHa).toFixed(4)),
    kgPvPerHa: Number((totalWeight / areaHa).toFixed(4)),
  };
}

export async function registerWeighing(
  farmId: string,
  payload: {
    localId: string;
    animalId?: string;
    weightKg: number;
    weighingDate: string;
    evidences: Array<{ evidenceId: string; evidenceKind: string }>;
  },
  user: AuthenticatedUser,
): Promise<{
  weighingId: string;
  gmd: number | null;
  headsPerHa: number | null;
  kgPvPerHa: number | null;
}> {
  await assertLocalWithoutActiveLock(farmId, payload.localId);
  validateEvidences('PESAGEM_REGISTRADA', payload.evidences);

  let gmd: number | null = null;
  if (payload.animalId) {
    gmd = await calculateAnimalGmd(farmId, payload.animalId, payload.weighingDate, payload.weightKg);
    await firestoreDatabase.collection(`farms/${farmId}/animals`).doc(payload.animalId).set(
      {
        weightKg: payload.weightKg,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  const lotation = await calculateLotationIndicators(farmId, payload.localId);

  const reference = firestoreDatabase.collection(`farms/${farmId}/weighings`).doc();
  await reference.set({
    id: reference.id,
    localId: payload.localId,
    animalId: payload.animalId ?? null,
    weightKg: payload.weightKg,
    weighingDate: payload.weighingDate,
    gmd,
    headsPerHa: lotation.headsPerHa,
    kgPvPerHa: lotation.kgPvPerHa,
    evidences: payload.evidences,
    createdBy: user.id,
    createdAt: FieldValue.serverTimestamp(),
  });

  await emitEvent({
    farmId,
    eventType: 'PESAGEM_REGISTRADA',
    actorId: user.id,
    actorRole: user.role,
    data: {
      weighingId: reference.id,
      localId: payload.localId,
      animalId: payload.animalId ?? null,
      weightKg: payload.weightKg,
      gmd,
      headsPerHa: lotation.headsPerHa,
      kgPvPerHa: lotation.kgPvPerHa,
    },
  });

  return { weighingId: reference.id, gmd, ...lotation };
}
