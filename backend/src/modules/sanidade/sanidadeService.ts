import { FieldValue } from 'firebase-admin/firestore';
import { consumeStock } from '../estoque/estoqueService';
import { assertLocalWithoutActiveLock } from '../rastreabilidade/lockGuard';
import { validateEvidences } from '../evidencias/evidencePolicyService';
import { firestoreDatabase } from '../../shared/firebaseAdmin';
import { emitEvent } from '../../shared/eventBus';
import { AuthenticatedUser } from '../../shared/auth/types';

export async function launchHealth(
  farmId: string,
  payload: {
    localId: string;
    stockItemId: string;
    quantity: number;
    targetType: 'ANIMAL' | 'LOTE';
    targetId: string;
    notes?: string;
    evidences: Array<{ evidenceId: string; evidenceKind: string }>;
  },
  user: AuthenticatedUser,
): Promise<{ healthRecordId: string }> {
  await assertLocalWithoutActiveLock(farmId, payload.localId);
  validateEvidences('MEDICACAO_LANCADA', payload.evidences);

  await consumeStock(farmId, {
    stockItemId: payload.stockItemId,
    quantity: payload.quantity,
    reason: 'MEDICACAO_LANCADA',
    localId: payload.localId,
  });

  const reference = firestoreDatabase.collection(`farms/${farmId}/healthRecords`).doc();
  await reference.set({
    id: reference.id,
    localId: payload.localId,
    stockItemId: payload.stockItemId,
    quantity: payload.quantity,
    targetType: payload.targetType,
    targetId: payload.targetId,
    notes: payload.notes ?? null,
    evidences: payload.evidences,
    createdBy: user.id,
    createdAt: FieldValue.serverTimestamp(),
  });

  await emitEvent({
    farmId,
    eventType: 'MEDICACAO_LANCADA',
    actorId: user.id,
    actorRole: user.role,
    data: {
      healthRecordId: reference.id,
      localId: payload.localId,
      stockItemId: payload.stockItemId,
      quantity: payload.quantity,
      targetType: payload.targetType,
      targetId: payload.targetId,
    },
  });

  return { healthRecordId: reference.id };
}
