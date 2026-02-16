import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDatabase } from '../../shared/firebaseAdmin';
import { stockIn } from '../estoque/estoqueService';

export async function registerInvoiceIn(
  farmId: string,
  payload: {
    supplierId: string;
    invoiceNumber: string;
    issueDate: string;
    items: Array<{
      stockItemId: string;
      quantity: number;
      unit: string;
      expiryDate?: string;
      unitCost: number;
    }>;
  },
): Promise<{ invoiceInId: string }> {
  const invoiceReference = firestoreDatabase.collection(`farms/${farmId}/invoicesIn`).doc();
  await invoiceReference.set({
    id: invoiceReference.id,
    supplierId: payload.supplierId,
    invoiceNumber: payload.invoiceNumber,
    issueDate: payload.issueDate,
    items: payload.items,
    importMode: 'PROCESSAMENTO_REAL',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  for (const item of payload.items) {
    await stockIn(farmId, {
      stockItemId: item.stockItemId,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate,
      unitCost: item.unitCost,
      sourceDocument: payload.invoiceNumber,
    });
  }

  return { invoiceInId: invoiceReference.id };
}
