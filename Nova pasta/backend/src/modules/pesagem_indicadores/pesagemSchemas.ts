import { z } from 'zod';

export const registerWeighingSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    localId: z.string().min(2),
    animalId: z.string().min(2).optional(),
    weightKg: z.number().positive(),
    weighingDate: z.string().min(8),
    evidences: z.array(
      z.object({ evidenceId: z.string().min(2), evidenceKind: z.string().min(2) }),
    ).min(1),
  }),
};
