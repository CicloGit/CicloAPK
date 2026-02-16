import { firestoreDatabase } from '../../shared/firebaseAdmin';
import { applyLocalLock, removeLocalLock } from './lockRepository';
import { emitEvent } from '../../shared/eventBus';
import { SystemRole } from '../../shared/auth/types';

export async function getExpectedHeadsByLocal(farmId: string, localId: string): Promise<number> {
  const snapshot = await firestoreDatabase
    .collection(`farms/${farmId}/animals`)
    .where('currentLocalId', '==', localId)
    .where('status', '==', 'ATIVO')
    .get();
  return snapshot.size;
}

export async function detectDivergenceAndApplyLocks(params: {
  farmId: string;
  localId: string;
  realCount: number;
  actorId: string;
  actorRole: SystemRole;
}): Promise<{ expectedCount: number; realCount: number; delta: number }> {
  const expectedCount = await getExpectedHeadsByLocal(params.farmId, params.localId);
  const delta = params.realCount - expectedCount;

  if (delta !== 0) {
    await applyLocalLock({
      farmId: params.farmId,
      localId: params.localId,
      reason: 'DIVERGENCIA_CONTAGEM_CABECAS',
      deltaHeads: delta,
    });
    await emitEvent({
      farmId: params.farmId,
      eventType: 'TRAVA_APLICADA',
      actorId: params.actorId,
      actorRole: params.actorRole,
      data: { localId: params.localId, expectedCount, realCount: params.realCount, delta },
    });
  } else {
    await removeLocalLock(params.farmId, params.localId);
    await emitEvent({
      farmId: params.farmId,
      eventType: 'TRAVA_REMOVIDA',
      actorId: params.actorId,
      actorRole: params.actorRole,
      data: { localId: params.localId, expectedCount, realCount: params.realCount, delta },
    });
  }

  return { expectedCount, realCount: params.realCount, delta };
}
