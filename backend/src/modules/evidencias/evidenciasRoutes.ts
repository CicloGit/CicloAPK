import { Router } from 'express';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { uploadEvidenceController } from './evidenciasController';
import { uploadEvidenceSchema } from './evidenciasSchemas';

export const evidenciasRoutes = Router();

evidenciasRoutes.post(
  '/farms/:farmId/evidences/upload',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO', 'OPERADOR'),
  validateRequest(uploadEvidenceSchema),
  asyncHandler(uploadEvidenceController),
);
