import { FieldValue } from 'firebase-admin/firestore';
import { firebaseStorage, firestoreDatabase } from '../../shared/firebaseAdmin';

export async function uploadEvidence(
  farmId: string,
  payload: {
    eventType: string;
    evidenceKind: string;
    fileName: string;
    fileContentBase64: string;
    mimeType: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ evidenceId: string; publicUrl: string }> {
  const evidenceReference = firestoreDatabase.collection(`farms/${farmId}/evidences`).doc();
  const objectPath = `farms/${farmId}/evidences/${evidenceReference.id}-${payload.fileName}`;

  const bucket = firebaseStorage.bucket();
  const file = bucket.file(objectPath);
  await file.save(Buffer.from(payload.fileContentBase64, 'base64'), {
    contentType: payload.mimeType,
    resumable: false,
    metadata: {
      metadata: {
        eventType: payload.eventType,
        evidenceKind: payload.evidenceKind,
      },
    },
  });

  const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '03-01-2500' });

  await evidenceReference.set({
    id: evidenceReference.id,
    eventType: payload.eventType,
    evidenceKind: payload.evidenceKind,
    fileName: payload.fileName,
    objectPath,
    mimeType: payload.mimeType,
    metadata: payload.metadata ?? {},
    publicUrl: signedUrl,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { evidenceId: evidenceReference.id, publicUrl: signedUrl };
}
