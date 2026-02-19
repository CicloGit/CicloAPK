import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../config/firebase';

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9_.-]/g, '_');
const MAX_STOCK_PROOF_BYTES = 10 * 1024 * 1024;

const assertImageFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Formato de arquivo invalido para comprovacao de perda.');
  }
};

const sha256File = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((value) => value.toString(16).padStart(2, '0')).join('');
};

export const storageService = {
  async uploadStockLossProof(file: File, tenantId: string, movementRef: string): Promise<string> {
    assertImageFile(file);
    if (file.size > MAX_STOCK_PROOF_BYTES) {
      throw new Error('Arquivo excede o limite de 10MB.');
    }

    const safeMovementRef = sanitizeFileName(movementRef || 'stock-loss');
    const fileName = `${Date.now()}_${safeMovementRef}_${sanitizeFileName(file.name)}`;
    const objectRef = ref(storage, `stock-loss-proofs/${tenantId}/${safeMovementRef}/${fileName}`);
    await uploadBytes(objectRef, file, {
      contentType: file.type || 'application/octet-stream',
    });
    return getDownloadURL(objectRef);
  },

  async uploadEvidenceFile(file: File, tenantId: string, txId: string, evidenceId: string): Promise<{ url: string; storagePath: string; hash: string }> {
    const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;
    const storagePath = `evidences/${tenantId}/${txId}/${evidenceId}/${fileName}`;
    const objectRef = ref(storage, storagePath);
    const hash = await sha256File(file);

    await uploadBytes(objectRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        sha256: hash,
        tenantId,
        txId,
        evidenceId,
      },
    });

    const url = await getDownloadURL(objectRef);
    return { url, storagePath, hash };
  },

  async uploadSupportAttachment(file: File, tenantId: string, ticketId: string): Promise<{ url: string; storagePath: string; hash: string }> {
    const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;
    const storagePath = `support/${tenantId}/${ticketId}/${fileName}`;
    const objectRef = ref(storage, storagePath);
    const hash = await sha256File(file);

    await uploadBytes(objectRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        sha256: hash,
        tenantId,
        ticketId,
      },
    });

    const url = await getDownloadURL(objectRef);
    return { url, storagePath, hash };
  },

  async uploadSeedDocument(file: File, tenantId: string, seedLotId: string): Promise<{ url: string; storagePath: string; hash: string }> {
    const fileName = `${Date.now()}_${sanitizeFileName(file.name)}`;
    const storagePath = `seeds/${tenantId}/${seedLotId}/${fileName}`;
    const objectRef = ref(storage, storagePath);
    const hash = await sha256File(file);

    await uploadBytes(objectRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        sha256: hash,
        tenantId,
        seedLotId,
      },
    });

    const url = await getDownloadURL(objectRef);
    return { url, storagePath, hash };
  },
};
