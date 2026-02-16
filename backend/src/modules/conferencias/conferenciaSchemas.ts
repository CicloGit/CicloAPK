import { z } from 'zod';

const evidenceSchema = z.object({
  evidenceId: z.string().min(2),
  evidenceKind: z.string().min(2),
});

export const openConferenceSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    localId: z.string().min(2),
    notes: z.string().optional(),
    evidences: z.array(evidenceSchema).min(1),
  }),
};

export const countConferenceSchema = {
  params: z.object({ farmId: z.string().min(2), id: z.string().min(2) }),
  body: z.object({
    realCount: z.number().int().min(0),
    notes: z.string().optional(),
  }),
};

export const approveConferenceSchema = {
  params: z.object({ farmId: z.string().min(2), id: z.string().min(2) }),
  body: z.object({ notes: z.string().optional() }),
};

export const rejectConferenceSchema = {
  params: z.object({ farmId: z.string().min(2), id: z.string().min(2) }),
  body: z.object({ reason: z.string().min(3) }),
};
