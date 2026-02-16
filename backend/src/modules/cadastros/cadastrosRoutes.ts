import { Router } from 'express';
import { createFarmController, registerGenericCadastroController } from './cadastrosController';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { createFarmSchema, registerGenericCadastroSchema } from './cadastrosSchemas';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { authorizeRoles } from '../../shared/auth/authMiddleware';

export const cadastrosRoutes = Router();

cadastrosRoutes.post(
  '/farms',
  authorizeRoles('ADMIN', 'GESTOR'),
  validateRequest(createFarmSchema),
  asyncHandler(createFarmController),
);

cadastrosRoutes.post(
  '/farms/:farmId/cadastros/:cadastroType',
  authorizeRoles('ADMIN', 'GESTOR'),
  validateRequest(registerGenericCadastroSchema),
  asyncHandler(registerGenericCadastroController),
);
