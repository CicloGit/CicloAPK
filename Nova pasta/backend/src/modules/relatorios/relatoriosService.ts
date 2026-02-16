import { firestoreDatabase } from '../../shared/firebaseAdmin';

export async function getActiveLocksReport(farmId: string) {
  const snapshot = await firestoreDatabase
    .collection(`farms/${farmId}/locks`)
    .where('active', '==', true)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    localId: String(doc.get('localId') ?? ''),
    reason: String(doc.get('reason') ?? ''),
    deltaHeads: Number(doc.get('deltaHeads') ?? 0),
  }));
}

export async function getBalanceByLocalReport(farmId: string) {
  const snapshot = await firestoreDatabase
    .collection(`farms/${farmId}/animals`)
    .where('status', '==', 'ATIVO')
    .get();

  const grouped = new Map<string, number>();
  snapshot.docs.forEach((doc) => {
    const localId = String(doc.get('currentLocalId') ?? 'SEM_LOCAL');
    grouped.set(localId, (grouped.get(localId) ?? 0) + 1);
  });

  return Array.from(grouped.entries()).map(([localId, heads]) => ({ localId, heads }));
}

export async function getGmdByLotReport(farmId: string) {
  const snapshot = await firestoreDatabase.collection(`farms/${farmId}/weighings`).get();

  const grouped = new Map<string, { total: number; count: number }>();
  snapshot.docs.forEach((doc) => {
    const localId = String(doc.get('localId') ?? 'SEM_LOCAL');
    const gmd = Number(doc.get('gmd') ?? 0);
    if (!gmd) {
      return;
    }
    const current = grouped.get(localId) ?? { total: 0, count: 0 };
    current.total += gmd;
    current.count += 1;
    grouped.set(localId, current);
  });

  return Array.from(grouped.entries()).map(([localId, value]) => ({
    localId,
    averageGmd: Number((value.total / value.count).toFixed(4)),
    samples: value.count,
  }));
}

export async function getConsumptionByLotReport(farmId: string) {
  const snapshot = await firestoreDatabase.collection(`farms/${farmId}/stockMovements`).get();

  const grouped = new Map<string, number>();
  snapshot.docs.forEach((doc) => {
    const direction = String(doc.get('direction') ?? '');
    if (direction !== 'OUT') {
      return;
    }
    const reason = String(doc.get('reason') ?? '');
    if (!['ALIMENTACAO_LANCADA', 'MEDICACAO_LANCADA'].includes(reason)) {
      return;
    }

    const localId = String(doc.get('localId') ?? 'SEM_LOCAL');
    const quantity = Number(doc.get('quantity') ?? 0);
    grouped.set(localId, (grouped.get(localId) ?? 0) + quantity);
  });

  return Array.from(grouped.entries()).map(([localId, consumedQuantity]) => ({
    localId,
    consumedQuantity,
  }));
}
