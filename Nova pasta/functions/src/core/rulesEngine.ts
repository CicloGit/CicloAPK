import { HttpsError } from 'firebase-functions/v2/https';

export const ensurePositiveAmount = (value: number, fieldName: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new HttpsError('invalid-argument', `${fieldName} deve ser maior que zero.`);
  }
};

export const ensureString = (value: unknown, fieldName: string): string => {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new HttpsError('invalid-argument', `${fieldName} obrigatorio.`);
  }
  return normalized;
};

export const ensureStockAvailability = (
  requestedQuantity: number,
  availableQuantity: number,
  listingId: string
): void => {
  if (requestedQuantity > availableQuantity) {
    throw new HttpsError(
      'failed-precondition',
      `Estoque insuficiente para listing ${listingId}. Disponivel=${availableQuantity}, solicitado=${requestedQuantity}.`
    );
  }
};
