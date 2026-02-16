import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDatabase } from '../../shared/firebaseAdmin';
import { ApplicationError } from '../../shared/errors/ApplicationError';
import { emitEvent } from '../../shared/eventBus';
import { AuthenticatedUser } from '../../shared/auth/types';
import { validateEvidences } from '../evidencias/evidencePolicyService';
import { detectDivergenceAndApplyLocks } from '../rastreabilidade/balanceService';

async function getConferenceReference(farmId: string, conferenceId: string) {
  return firestoreDatabase.collection(`farms/${farmId}/conferences`).doc(conferenceId);
}

export async function openConference(
  farmId: string,
  payload: { localId: string; notes?: string; evidences: Array<{ evidenceId: string; evidenceKind: string }> },
  user: AuthenticatedUser,
): Promise<{ id: string }> {
  validateEvidences('CONFERENCIA_ABERTA', payload.evidences);

  const reference = firestoreDatabase.collection(`farms/${farmId}/conferences`).doc();
  await reference.set({
    id: reference.id,
    localId: payload.localId,
    status: 'ABERTA',
    openedBy: user.id,
    notes: payload.notes ?? null,
    evidences: payload.evidences,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await emitEvent({
    farmId,
    eventType: 'CONFERENCIA_ABERTA',
    actorId: user.id,
    actorRole: user.role,
    data: { conferenceId: reference.id, localId: payload.localId },
  });

  return { id: reference.id };
}

export async function countConference(
  farmId: string,
  conferenceId: string,
  payload: { realCount: number; notes?: string },
  user: AuthenticatedUser,
): Promise<void> {
  const conferenceReference = await getConferenceReference(farmId, conferenceId);
  const snapshot = await conferenceReference.get();
  if (!snapshot.exists) {
    throw new ApplicationError('Conferencia nao encontrada.', 404, 'CONFERENCE_NOT_FOUND');
  }

  await conferenceReference.set(
    {
      status: 'EM_ANALISE',
      countedBy: user.id,
      realCount: payload.realCount,
      countNotes: payload.notes ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export async function approveConference(
  farmId: string,
  conferenceId: string,
  payload: { notes?: string },
  user: AuthenticatedUser,
): Promise<{ delta: number; expectedCount: number; realCount: number }> {
  const conferenceReference = await getConferenceReference(farmId, conferenceId);
  const snapshot = await conferenceReference.get();
  if (!snapshot.exists) {
    throw new ApplicationError('Conferencia nao encontrada.', 404, 'CONFERENCE_NOT_FOUND');
  }

  const status = String(snapshot.get('status') ?? '');
  if (status !== 'EM_ANALISE') {
    throw new ApplicationError('Conferencia precisa estar EM_ANALISE para aprovacao.', 409);
  }

  const openedBy = String(snapshot.get('openedBy') ?? '');
  const countedBy = String(snapshot.get('countedBy') ?? '');
  if (user.id === openedBy || user.id === countedBy) {
    throw new ApplicationError(
      'Aprovador nao pode ser o mesmo usuario que originou a divergencia.',
      409,
      'SEGREGATION_OF_DUTIES',
    );
  }

  const localId = String(snapshot.get('localId') ?? '');
  const realCount = Number(snapshot.get('realCount') ?? 0);
  const divergenceResult = await detectDivergenceAndApplyLocks({
    farmId,
    localId,
    realCount,
    actorId: user.id,
    actorRole: user.role,
  });

  await conferenceReference.set(
    {
      status: 'APROVADA',
      approvedBy: user.id,
      approvalNotes: payload.notes ?? null,
      delta: divergenceResult.delta,
      expectedCount: divergenceResult.expectedCount,
      updatedAt: FieldValue.serverTimestamp(),
      approvedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await firestoreDatabase.collection(`farms/${farmId}/locals`).doc(localId).set(
    {
      lastApprovedConferenceId: conferenceId,
      lastApprovedConferenceAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await emitEvent({
    farmId,
    eventType: 'CONFERENCIA_APROVADA',
    actorId: user.id,
    actorRole: user.role,
    data: {
      conferenceId,
      localId,
      ...divergenceResult,
    },
  });

  return divergenceResult;
}

export async function rejectConference(
  farmId: string,
  conferenceId: string,
  payload: { reason: string },
  user: AuthenticatedUser,
): Promise<void> {
  const conferenceReference = await getConferenceReference(farmId, conferenceId);
  const snapshot = await conferenceReference.get();
  if (!snapshot.exists) {
    throw new ApplicationError('Conferencia nao encontrada.', 404, 'CONFERENCE_NOT_FOUND');
  }

  await conferenceReference.set(
    {
      status: 'REPROVADA',
      rejectedBy: user.id,
      rejectReason: payload.reason,
      updatedAt: FieldValue.serverTimestamp(),
      rejectedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
