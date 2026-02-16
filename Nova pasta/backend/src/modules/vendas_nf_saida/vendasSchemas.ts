import { z } from 'zod';

const evidenceSchema = z.object({
  evidenceId: z.string().min(2),
  evidenceKind: z.string().min(2),
});

export const createSalesOrderSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    localId: z.string().min(2),
    customerId: z.string().min(2),
    animalIds: z.array(z.string().min(2)).min(1),
    expectedIssueDate: z.string().min(8),
    evidences: z.array(evidenceSchema).min(1),
  }),
};

export const issueSalesOrderSchema = {
  params: z.object({ farmId: z.string().min(2), id: z.string().min(2) }),
  body: z.object({
    invoiceNumber: z.string().min(2),
    issueDate: z.string().min(8),
  }),
};
