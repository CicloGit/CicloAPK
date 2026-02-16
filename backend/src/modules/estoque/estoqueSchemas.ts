import { z } from 'zod';

export const stockInSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    stockItemId: z.string().min(2),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    expiryDate: z.string().optional(),
    unitCost: z.number().nonnegative().default(0),
    sourceDocument: z.string().optional(),
  }),
};

export const createStockItemSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    name: z.string().min(2),
    category: z.string().min(2),
    unit: z.string().min(1),
    minimumLevel: z.number().nonnegative().default(0),
  }),
};

export const stockConsumeSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    stockItemId: z.string().min(2),
    quantity: z.number().positive(),
    reason: z.string().min(3),
    localId: z.string().min(2),
  }),
};
