import { FieldValue } from 'firebase-admin/firestore';
import { consumeStock } from '../estoque/estoqueService';
import { assertLocalWithoutActiveLock } from '../rastreabilidade/lockGuard';
import { validateEvidences } from '../evidencias/evidencePolicyService';
import { firestoreDatabase } from '../../shared/firebaseAdmin';
import { emitEvent } from '../../shared/eventBus';
import { AuthenticatedUser } from '../../shared/auth/types';

export async function launchFeed(
  farmId: string,
  payload: {
    localId: string;
    stockItemId: string;
    quantity: number;
    notes?: string;
    evidences: Array<{ evidenceId: string; evidenceKind: string }>;
  },
  user: AuthenticatedUser,
): Promise<{ feedingId: string }> {
  await assertLocalWithoutActiveLock(farmId, payload.localId);
  validateEvidences('ALIMENTACAO_LANCADA', payload.evidences);

  await consumeStock(farmId, {
    stockItemId: payload.stockItemId,
    quantity: payload.quantity,
    reason: 'ALIMENTACAO_LANCADA',
    localId: payload.localId,
  });

  const reference = firestoreDatabase.collection(`farms/${farmId}/feeding`).doc();
  await reference.set({
    id: reference.id,
    localId: payload.localId,
    stockItemId: payload.stockItemId,
    quantity: payload.quantity,
    notes: payload.notes ?? null,
    evidences: payload.evidences,
    createdBy: user.id,
    createdAt: FieldValue.serverTimestamp(),
  });

  await emitEvent({
    farmId,
    eventType: 'ALIMENTACAO_LANCADA',
    actorId: user.id,
    actorRole: user.role,
    data: {
      feedingId: reference.id,
      localId: payload.localId,
      stockItemId: payload.stockItemId,
      quantity: payload.quantity,
    },
  });

  return { feedingId: reference.id };
}
