import { Router } from 'express';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { registerWeighingController } from './pesagemController';
import { registerWeighingSchema } from './pesagemSchemas';

export const pesagemRoutes = Router();

pesagemRoutes.post(
  '/farms/:farmId/weighings',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO', 'OPERADOR'),
  validateRequest(registerWeighingSchema),
  asyncHandler(registerWeighingController),
);
