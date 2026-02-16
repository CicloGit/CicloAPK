import { Router } from 'express';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { createSalesOrderController, issueSalesOrderController } from './vendasController';
import { createSalesOrderSchema, issueSalesOrderSchema } from './vendasSchemas';

export const vendasRoutes = Router();

vendasRoutes.post(
  '/farms/:farmId/sales/orders',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO'),
  validateRequest(createSalesOrderSchema),
  asyncHandler(createSalesOrderController),
);

vendasRoutes.post(
  '/farms/:farmId/sales/orders/:id/issue',
  authorizeRoles('ADMIN', 'GESTOR'),
  validateRequest(issueSalesOrderSchema),
  asyncHandler(issueSalesOrderController),
);
