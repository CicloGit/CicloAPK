import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDatabase } from '../../shared/firebaseAdmin';
import { ApplicationError } from '../../shared/errors/ApplicationError';
import { emitEvent } from '../../shared/eventBus';
import { validateEvidences } from '../evidencias/evidencePolicyService';
import { assertLocalWithoutActiveLock } from '../rastreabilidade/lockGuard';
import { AuthenticatedUser } from '../../shared/auth/types';

function calculateCheckDigit(text: string): string {
  const total = text
    .split('')
    .map((char) => char.charCodeAt(0))
    .reduce((sum, value) => sum + value, 0);
  return String(total % 9);
}

function buildMotherShortIdentification(organizationCode: string, sequenceNumber: number): string {
  const sequenceText = String(sequenceNumber).padStart(5, '0');
  const base = `${organizationCode}-${sequenceText}`;
  return `${base}-${calculateCheckDigit(base)}`;
}

function buildChildShortIdentification(motherShortIdentification: string, childNumber: number): string {
  return `${motherShortIdentification}-${String(childNumber).padStart(2, '0')}`;
}

async function getMotherChildrenCount(farmId: string, motherShortIdentification: string): Promise<number> {
  const snapshot = await firestoreDatabase
    .collection(`farms/${farmId}/animals`)
    .where('motherShortIdentification', '==', motherShortIdentification)
    .get();
  return snapshot.size;
}

export async function createAnimal(
  farmId: string,
  payload: {
    tag: string;
    shortIdentification: string;
    cycle: string;
    stage: string;
    currentLocalId: string;
  },
  user: AuthenticatedUser,
): Promise<{ id: string }> {
  const reference = firestoreDatabase.collection(`farms/${farmId}/animals`).doc();
  await reference.set({
    id: reference.id,
    ...payload,
    status: 'ATIVO',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await emitEvent({
    farmId,
    eventType: 'ANIMAL_COMPRADO',
    actorId: user.id,
    actorRole: user.role,
    data: { animalId: reference.id, source: 'CADASTRO_MANUAL' },
  });

  return { id: reference.id };
}

export async function registerBirth(
  farmId: string,
  payload: {
    organizationCode: string;
    motherShortIdentification: string;
    cycle: string;
    currentLocalId: string;
    birthDate: string;
    evidences: Array<{ evidenceId: string; evidenceKind: string }>;
  },
  user: AuthenticatedUser,
): Promise<{ id: string; shortIdentification: string }> {
  validateEvidences('ANIMAL_NASCIDO', payload.evidences);

  const childrenCount = await getMotherChildrenCount(farmId, payload.motherShortIdentification);
  const childShortIdentification = buildChildShortIdentification(
    payload.motherShortIdentification,
    childrenCount + 1,
  );

  const reference = firestoreDatabase.collection(`farms/${farmId}/animals`).doc();
  await reference.set({
    id: reference.id,
    tag: `TAG-${reference.id.slice(0, 8)}`,
    shortIdentification: childShortIdentification,
    motherShortIdentification: payload.motherShortIdentification,
    cycle: payload.cycle,
    stage: 'CRIA',
    status: 'ATIVO',
    currentLocalId: payload.currentLocalId,
    birthDate: payload.birthDate,
    evidences: payload.evidences,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await emitEvent({
    farmId,
    eventType: 'ANIMAL_NASCIDO',
    actorId: user.id,
    actorRole: user.role,
    data: {
      animalId: reference.id,
      shortIdentification: childShortIdentification,
      motherShortIdentification: payload.motherShortIdentification,
      localId: payload.currentLocalId,
    },
  });

  return { id: reference.id, shortIdentification: childShortIdentification };
}

export async function registerPurchase(
  farmId: string,
  payload: {
    organizationCode: string;
    cycle: string;
    currentLocalId: string;
    purchaseDate: string;
    supplierId: string;
    quantity: number;
    evidences: Array<{ evidenceId: string; evidenceKind: string }>;
  },
  user: AuthenticatedUser,
): Promise<{ createdAnimalIds: string[] }> {
  validateEvidences('ANIMAL_COMPRADO', payload.evidences);

  const collection = firestoreDatabase.collection(`farms/${farmId}/animals`);
  const snapshot = await collection.get();
  let sequence = snapshot.size + 1;

  const createdAnimalIds: string[] = [];
  for (let index = 0; index < payload.quantity; index += 1) {
    const shortIdentification = buildMotherShortIdentification(payload.organizationCode, sequence);
    const reference = collection.doc();
    await reference.set({
      id: reference.id,
      tag: `TAG-${reference.id.slice(0, 8)}`,
      shortIdentification,
      cycle: payload.cycle,
      stage: 'RECRIA',
      status: 'ATIVO',
      currentLocalId: payload.currentLocalId,
      purchaseDate: payload.purchaseDate,
      supplierId: payload.supplierId,
      evidences: payload.evidences,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    createdAnimalIds.push(reference.id);
    sequence += 1;
  }

  await emitEvent({
    farmId,
    eventType: 'ANIMAL_COMPRADO',
    actorId: user.id,
    actorRole: user.role,
    data: {
      quantity: payload.quantity,
      localId: payload.currentLocalId,
      supplierId: payload.supplierId,
      createdAnimalIds,
    },
  });

  return { createdAnimalIds };
}

export async function transferAnimal(
  farmId: string,
  payload: {
    animalId: string;
    fromLocalId: string;
    toLocalId: string;
    evidences: Array<{ evidenceId: string; evidenceKind: string }>;
  },
  user: AuthenticatedUser,
): Promise<void> {
  validateEvidences('TRANSFERENCIA_LOCAL', payload.evidences);

  await assertLocalWithoutActiveLock(farmId, payload.fromLocalId);
  await assertLocalWithoutActiveLock(farmId, payload.toLocalId);

  const animalReference = firestoreDatabase.collection(`farms/${farmId}/animals`).doc(payload.animalId);
  const animalSnapshot = await animalReference.get();
  if (!animalSnapshot.exists) {
    throw new ApplicationError('Animal nao encontrado.', 404, 'ANIMAL_NOT_FOUND');
  }

  const currentLocalId = String(animalSnapshot.get('currentLocalId') ?? '');
  if (currentLocalId !== payload.fromLocalId) {
    throw new ApplicationError('Animal nao pertence ao local informado para origem.', 409);
  }

  await animalReference.set(
    {
      currentLocalId: payload.toLocalId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await emitEvent({
    farmId,
    eventType: 'TRANSFERENCIA_LOCAL',
    actorId: user.id,
    actorRole: user.role,
    data: {
      animalId: payload.animalId,
      fromLocalId: payload.fromLocalId,
      toLocalId: payload.toLocalId,
    },
  });
}

async function validateStageTransitionPolicies(
  farmId: string,
  animalId: string,
  localId: string,
): Promise<void> {
  await assertLocalWithoutActiveLock(farmId, localId);

  const localSnapshot = await firestoreDatabase.collection(`farms/${farmId}/locals`).doc(localId).get();
  const lastApprovedConferenceId = String(localSnapshot.get('lastApprovedConferenceId') ?? '');
  if (!lastApprovedConferenceId) {
    throw new ApplicationError(
      'Mudanca de estagio bloqueada: local sem conferencia aprovada.',
      409,
      'STAGE_CHANGE_REQUIRES_APPROVED_CONFERENCE',
    );
  }

  const weighingSnapshot = await firestoreDatabase
    .collection(`farms/${farmId}/weighings`)
    .where('animalId', '==', animalId)
    .orderBy('weighingDate', 'desc')
    .limit(1)
    .get();
  if (weighingSnapshot.empty) {
    throw new ApplicationError(
      'Mudanca de estagio bloqueada: pesagem valida obrigatoria.',
      409,
      'STAGE_CHANGE_REQUIRES_WEIGHING',
    );
  }
}

export async function changeAnimalStage(
  farmId: string,
  animalId: string,
  payload: { newStage: string; cycle: string },
): Promise<void> {
  const animalReference = firestoreDatabase.collection(`farms/${farmId}/animals`).doc(animalId);
  const animalSnapshot = await animalReference.get();
  if (!animalSnapshot.exists) {
    throw new ApplicationError('Animal nao encontrado.', 404, 'ANIMAL_NOT_FOUND');
  }

  const localId = String(animalSnapshot.get('currentLocalId') ?? '');
  if (!localId) {
    throw new ApplicationError('Animal sem local alocado.', 409);
  }

  await validateStageTransitionPolicies(farmId, animalId, localId);

  await animalReference.set(
    {
      stage: payload.newStage,
      cycle: payload.cycle,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
