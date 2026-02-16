import { z } from 'zod';

export const createLocalSchema = {
  params: z.object({
    farmId: z.string().min(2),
  }),
  body: z.object({
    name: z.string().min(2),
    type: z.enum(['LOTE', 'PASTO']),
    capacityHeads: z.number().int().positive(),
    areaHa: z.number().positive().optional(),
    status: z.enum(['ATIVO', 'INATIVO']).default('ATIVO'),
  }),
};
