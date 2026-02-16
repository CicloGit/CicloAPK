import { Router } from 'express';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { registerInvoiceInController } from './nfEntradaController';
import { registerInvoiceInSchema } from './nfEntradaSchemas';

export const nfEntradaRoutes = Router();

nfEntradaRoutes.post(
  '/farms/:farmId/invoices/in',
  authorizeRoles('ADMIN', 'GESTOR'),
  validateRequest(registerInvoiceInSchema),
  asyncHandler(registerInvoiceInController),
);
