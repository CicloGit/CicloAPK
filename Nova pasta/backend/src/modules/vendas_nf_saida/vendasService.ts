import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDatabase } from '../../shared/firebaseAdmin';
import { ApplicationError } from '../../shared/errors/ApplicationError';
import { assertLocalWithoutActiveLock } from '../rastreabilidade/lockGuard';
import { validateEvidences } from '../evidencias/evidencePolicyService';
import { emitEvent } from '../../shared/eventBus';
import { AuthenticatedUser } from '../../shared/auth/types';

export async function createSalesOrder(
  farmId: string,
  payload: {
    localId: string;
    customerId: string;
    animalIds: string[];
    expectedIssueDate: string;
    evidences: Array<{ evidenceId: string; evidenceKind: string }>;
  },
  user: AuthenticatedUser,
): Promise<{ orderId: string }> {
  await assertLocalWithoutActiveLock(farmId, payload.localId);
  validateEvidences('VENDA_REALIZADA', payload.evidences);

  const reference = firestoreDatabase.collection(`farms/${farmId}/salesOrders`).doc();
  await reference.set({
    id: reference.id,
    localId: payload.localId,
    customerId: payload.customerId,
    animalIds: payload.animalIds,
    expectedIssueDate: payload.expectedIssueDate,
    evidences: payload.evidences,
    status: 'ABERTA',
    createdBy: user.id,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { orderId: reference.id };
}

export async function issueSalesOrder(
  farmId: string,
  orderId: string,
  payload: { invoiceNumber: string; issueDate: string },
  user: AuthenticatedUser,
): Promise<void> {
  const orderReference = firestoreDatabase.collection(`farms/${farmId}/salesOrders`).doc(orderId);
  const orderSnapshot = await orderReference.get();
  if (!orderSnapshot.exists) {
    throw new ApplicationError('Ordem de venda nao encontrada.', 404, 'SALES_ORDER_NOT_FOUND');
  }

  const status = String(orderSnapshot.get('status') ?? '');
  if (status !== 'ABERTA') {
    throw new ApplicationError('Somente ordens ABERTAS podem ser emitidas.', 409);
  }

  const localId = String(orderSnapshot.get('localId') ?? '');
  await assertLocalWithoutActiveLock(farmId, localId);

  const animalIds = (orderSnapshot.get('animalIds') as string[]) ?? [];
  for (const animalId of animalIds) {
    await firestoreDatabase.collection(`farms/${farmId}/animals`).doc(animalId).set(
      {
        status: 'VENDIDO',
        stage: 'VENDIDO',
        soldAt: payload.issueDate,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await orderReference.set(
    {
      status: 'EMITIDA',
      invoiceNumber: payload.invoiceNumber,
      issueDate: payload.issueDate,
      issuedBy: user.id,
      updatedAt: FieldValue.serverTimestamp(),
      issuedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await emitEvent({
    farmId,
    eventType: 'VENDA_REALIZADA',
    actorId: user.id,
    actorRole: user.role,
    data: {
      orderId,
      invoiceNumber: payload.invoiceNumber,
      issueDate: payload.issueDate,
      animalIds,
      localId,
    },
  });
}
