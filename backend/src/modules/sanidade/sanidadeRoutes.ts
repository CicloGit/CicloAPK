import { Router } from 'express';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { launchHealthController } from './sanidadeController';
import { launchHealthSchema } from './sanidadeSchemas';

export const sanidadeRoutes = Router();

sanidadeRoutes.post(
  '/farms/:farmId/health',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO', 'OPERADOR'),
  validateRequest(launchHealthSchema),
  asyncHandler(launchHealthController),
);
