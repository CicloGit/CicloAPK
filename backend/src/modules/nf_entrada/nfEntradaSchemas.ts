import { z } from 'zod';

export const registerInvoiceInSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    supplierId: z.string().min(2),
    invoiceNumber: z.string().min(2),
    issueDate: z.string().min(8),
    items: z.array(
      z.object({
        stockItemId: z.string().min(2),
        quantity: z.number().positive(),
        unit: z.string().min(1),
        expiryDate: z.string().optional(),
        unitCost: z.number().nonnegative().default(0),
      }),
    ).min(1),
  }),
};
