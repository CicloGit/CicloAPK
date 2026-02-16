import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDatabase } from '../../shared/firebaseAdmin';
import { ApplicationError } from '../../shared/errors/ApplicationError';

async function ensureStockItemExists(farmId: string, stockItemId: string): Promise<void> {
  const reference = firestoreDatabase.collection(`farms/${farmId}/stockItems`).doc(stockItemId);
  const snapshot = await reference.get();
  if (!snapshot.exists) {
    throw new ApplicationError('Item de estoque nao encontrado.', 404, 'STOCK_ITEM_NOT_FOUND');
  }
}

export async function createStockItem(
  farmId: string,
  payload: {
    name: string;
    category: string;
    unit: string;
    minimumLevel: number;
  },
): Promise<{ stockItemId: string }> {
  const reference = firestoreDatabase.collection(`farms/${farmId}/stockItems`).doc();
  await reference.set({
    id: reference.id,
    name: payload.name,
    category: payload.category,
    unit: payload.unit,
    minimumLevel: payload.minimumLevel,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { stockItemId: reference.id };
}

export async function stockIn(
  farmId: string,
  payload: {
    stockItemId: string;
    quantity: number;
    unit: string;
    expiryDate?: string;
    unitCost: number;
    sourceDocument?: string;
  },
): Promise<{ batchId: string }> {
  await ensureStockItemExists(farmId, payload.stockItemId);

  const batchReference = firestoreDatabase.collection(`farms/${farmId}/stockBatches`).doc();
  await batchReference.set({
    id: batchReference.id,
    stockItemId: payload.stockItemId,
    quantityOriginal: payload.quantity,
    quantityAvailable: payload.quantity,
    unit: payload.unit,
    unitCost: payload.unitCost,
    expiryDate: payload.expiryDate ?? null,
    sourceDocument: payload.sourceDocument ?? null,
    status: 'ATIVO',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const movementReference = firestoreDatabase.collection(`farms/${farmId}/stockMovements`).doc();
  await movementReference.set({
    id: movementReference.id,
    stockItemId: payload.stockItemId,
    batchId: batchReference.id,
    direction: 'IN',
    quantity: payload.quantity,
    reason: 'ENTRADA_ESTOQUE',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { batchId: batchReference.id };
}

async function getFefoBatches(farmId: string, stockItemId: string) {
  const snapshot = await firestoreDatabase
    .collection(`farms/${farmId}/stockBatches`)
    .where('stockItemId', '==', stockItemId)
    .where('status', '==', 'ATIVO')
    .get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      quantityAvailable: Number(doc.get('quantityAvailable') ?? 0),
      expiryDate: String(doc.get('expiryDate') ?? '9999-12-31'),
    }))
    .filter((item) => item.quantityAvailable > 0)
    .sort((left, right) => left.expiryDate.localeCompare(right.expiryDate));
}

export async function consumeStock(
  farmId: string,
  payload: {
    stockItemId: string;
    quantity: number;
    reason: string;
    localId: string;
  },
): Promise<{ consumedFromBatches: Array<{ batchId: string; quantity: number }> }> {
  await ensureStockItemExists(farmId, payload.stockItemId);

  const batches = await getFefoBatches(farmId, payload.stockItemId);
  const totalAvailable = batches.reduce((sum, item) => sum + item.quantityAvailable, 0);
  if (totalAvailable < payload.quantity) {
    throw new ApplicationError('Saldo de estoque insuficiente para consumo.', 409, 'NEGATIVE_STOCK_NOT_ALLOWED');
  }

  let remainingQuantity = payload.quantity;
  const consumedFromBatches: Array<{ batchId: string; quantity: number }> = [];

  for (const batch of batches) {
    if (remainingQuantity <= 0) {
      break;
    }

    const quantityToConsume = Math.min(batch.quantityAvailable, remainingQuantity);
    remainingQuantity -= quantityToConsume;
    consumedFromBatches.push({ batchId: batch.id, quantity: quantityToConsume });

    await firestoreDatabase
      .collection(`farms/${farmId}/stockBatches`)
      .doc(batch.id)
      .set(
        {
          quantityAvailable: batch.quantityAvailable - quantityToConsume,
          status: batch.quantityAvailable - quantityToConsume <= 0 ? 'ESGOTADO' : 'ATIVO',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    const movementReference = firestoreDatabase.collection(`farms/${farmId}/stockMovements`).doc();
    await movementReference.set({
      id: movementReference.id,
      stockItemId: payload.stockItemId,
      batchId: batch.id,
      direction: 'OUT',
      quantity: quantityToConsume,
      reason: payload.reason,
      localId: payload.localId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return { consumedFromBatches };
}
