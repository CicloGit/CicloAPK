import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../config/firebase';

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9_.-]/g, '_');

export const storageService = {
  async uploadStockLossProof(file: File, movementRef: string): Promise<string> {
    const fileName = `${Date.now()}_${movementRef}_${sanitizeFileName(file.name)}`;
    const objectRef = ref(storage, `stock-loss-proofs/${fileName}`);
    await uploadBytes(objectRef, file, {
      contentType: file.type || 'application/octet-stream',
    });
    return getDownloadURL(objectRef);
  },
};
