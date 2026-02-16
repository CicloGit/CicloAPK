import { Router } from 'express';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { createLocalSchema } from './locaisSchemas';
import { createLocalController } from './locaisController';

export const locaisRoutes = Router();

locaisRoutes.post(
  '/farms/:farmId/locals',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO'),
  validateRequest(createLocalSchema),
  asyncHandler(createLocalController),
);
