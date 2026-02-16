import { Router } from 'express';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { validateRequest } from '../../shared/middleware/validateRequest';
import {
  changeAnimalStageController,
  createAnimalController,
  registerBirthController,
  registerPurchaseController,
  transferAnimalController,
} from './rebanhoController';
import {
  changeAnimalStageSchema,
  createAnimalSchema,
  registerBirthSchema,
  registerPurchaseSchema,
  transferAnimalSchema,
} from './rebanhoSchemas';

export const rebanhoRoutes = Router();

rebanhoRoutes.post(
  '/farms/:farmId/animals',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO'),
  validateRequest(createAnimalSchema),
  asyncHandler(createAnimalController),
);

rebanhoRoutes.post(
  '/farms/:farmId/animals/birth',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO', 'OPERADOR'),
  validateRequest(registerBirthSchema),
  asyncHandler(registerBirthController),
);

rebanhoRoutes.post(
  '/farms/:farmId/animals/purchase',
  authorizeRoles('ADMIN', 'GESTOR'),
  validateRequest(registerPurchaseSchema),
  asyncHandler(registerPurchaseController),
);

rebanhoRoutes.post(
  '/farms/:farmId/transfers',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO', 'OPERADOR'),
  validateRequest(transferAnimalSchema),
  asyncHandler(transferAnimalController),
);

rebanhoRoutes.post(
  '/farms/:farmId/animals/:animalId/stage',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO'),
  validateRequest(changeAnimalStageSchema),
  asyncHandler(changeAnimalStageController),
);
