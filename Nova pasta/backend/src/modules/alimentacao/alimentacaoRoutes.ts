import { Router } from 'express';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { launchFeedController } from './alimentacaoController';
import { launchFeedSchema } from './alimentacaoSchemas';

export const alimentacaoRoutes = Router();

alimentacaoRoutes.post(
  '/farms/:farmId/feed',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO', 'OPERADOR'),
  validateRequest(launchFeedSchema),
  asyncHandler(launchFeedController),
);
