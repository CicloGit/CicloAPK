import { z } from 'zod';

const evidenceSchema = z.object({
  evidenceId: z.string().min(2),
  evidenceKind: z.string().min(2),
});

export const createAnimalSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    tag: z.string().min(2),
    shortIdentification: z.string().min(3),
    cycle: z.string().min(2),
    stage: z.enum([
      'CRIA',
      'RECRIA',
      'ENGORDA',
      'TERMINACAO',
      'CONFINAMENTO',
      'REPRODUCAO',
      'DESCARTE',
      'VENDIDO',
      'MORTO',
    ]),
    currentLocalId: z.string().min(2),
  }),
};

export const registerBirthSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    organizationCode: z.string().min(2),
    motherShortIdentification: z.string().min(5),
    cycle: z.string().min(2),
    currentLocalId: z.string().min(2),
    birthDate: z.string().min(8),
    evidences: z.array(evidenceSchema).min(1),
  }),
};

export const registerPurchaseSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    organizationCode: z.string().min(2),
    cycle: z.string().min(2),
    currentLocalId: z.string().min(2),
    purchaseDate: z.string().min(8),
    supplierId: z.string().min(2),
    quantity: z.number().int().positive(),
    evidences: z.array(evidenceSchema).min(1),
  }),
};

export const transferAnimalSchema = {
  params: z.object({ farmId: z.string().min(2) }),
  body: z.object({
    animalId: z.string().min(2),
    fromLocalId: z.string().min(2),
    toLocalId: z.string().min(2),
    evidences: z.array(evidenceSchema).min(1),
  }),
};

export const changeAnimalStageSchema = {
  params: z.object({
    farmId: z.string().min(2),
    animalId: z.string().min(2),
  }),
  body: z.object({
    newStage: z.enum([
      'CRIA',
      'RECRIA',
      'ENGORDA',
      'TERMINACAO',
      'CONFINAMENTO',
      'REPRODUCAO',
      'DESCARTE',
      'VENDIDO',
      'MORTO',
    ]),
    cycle: z.string().min(2),
  }),
};
