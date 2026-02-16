import { ApplicationError } from '../../shared/errors/ApplicationError';
import { getActiveLockByLocal } from './lockRepository';

export async function assertLocalWithoutActiveLock(farmId: string, localId: string): Promise<void> {
  const lock = await getActiveLockByLocal(farmId, localId);
  if (lock) {
    throw new ApplicationError(
      `Local ${localId} bloqueado por divergencia de cabecas. Delta atual ${lock.deltaHeads}.`,
      409,
      'LOCAL_LOCKED',
    );
  }
}
