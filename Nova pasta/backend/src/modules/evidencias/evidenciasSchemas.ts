import { z } from 'zod';

export const uploadEvidenceSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    eventType: z.string().min(3),
    evidenceKind: z.enum(['RFID', 'GPS', 'BALANCA', 'CAMERA', 'FOTO']),
    fileName: z.string().min(3),
    fileContentBase64: z.string().min(10),
    mimeType: z.string().min(3),
    metadata: z.record(z.unknown()).optional(),
  }),
};
