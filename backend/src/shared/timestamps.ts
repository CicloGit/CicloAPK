import { FieldValue } from 'firebase-admin/firestore';

export function createAuditTimestamps() {
  return {
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export function updateAuditTimestamp() {
  return {
    updatedAt: FieldValue.serverTimestamp(),
  };
}
