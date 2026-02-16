import { z } from 'zod';

export const launchHealthSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    localId: z.string().min(2),
    stockItemId: z.string().min(2),
    quantity: z.number().positive(),
    targetType: z.enum(['ANIMAL', 'LOTE']),
    targetId: z.string().min(2),
    notes: z.string().optional(),
    evidences: z.array(
      z.object({ evidenceId: z.string().min(2), evidenceKind: z.string().min(2) }),
    ).min(1),
  }),
};
