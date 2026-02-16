import { Router } from 'express';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { createStockItemController, stockConsumeController, stockInController } from './estoqueController';
import { createStockItemSchema, stockConsumeSchema, stockInSchema } from './estoqueSchemas';

export const estoqueRoutes = Router();

estoqueRoutes.post(
  '/farms/:farmId/stock/items',
  authorizeRoles('ADMIN', 'GESTOR', 'OPERADOR'),
  validateRequest(createStockItemSchema),
  asyncHandler(createStockItemController),
);

estoqueRoutes.post(
  '/farms/:farmId/stock/in',
  authorizeRoles('ADMIN', 'GESTOR', 'OPERADOR'),
  validateRequest(stockInSchema),
  asyncHandler(stockInController),
);

estoqueRoutes.post(
  '/farms/:farmId/stock/consume',
  authorizeRoles('ADMIN', 'GESTOR', 'OPERADOR'),
  validateRequest(stockConsumeSchema),
  asyncHandler(stockConsumeController),
);
