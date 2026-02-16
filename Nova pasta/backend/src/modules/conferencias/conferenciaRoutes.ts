import { Router } from 'express';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import { validateRequest } from '../../shared/middleware/validateRequest';
import {
  approveConferenceController,
  countConferenceController,
  openConferenceController,
  rejectConferenceController,
} from './conferenciaController';
import {
  approveConferenceSchema,
  countConferenceSchema,
  openConferenceSchema,
  rejectConferenceSchema,
} from './conferenciaSchemas';

export const conferenciaRoutes = Router();

conferenciaRoutes.post(
  '/farms/:farmId/conferences/open',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO'),
  validateRequest(openConferenceSchema),
  asyncHandler(openConferenceController),
);

conferenciaRoutes.post(
  '/farms/:farmId/conferences/:id/count',
  authorizeRoles('ADMIN', 'GESTOR', 'TECNICO'),
  validateRequest(countConferenceSchema),
  asyncHandler(countConferenceController),
);

conferenciaRoutes.post(
  '/farms/:farmId/conferences/:id/approve',
  authorizeRoles('ADMIN', 'GESTOR'),
  validateRequest(approveConferenceSchema),
  asyncHandler(approveConferenceController),
);

conferenciaRoutes.post(
  '/farms/:farmId/conferences/:id/reject',
  authorizeRoles('ADMIN', 'GESTOR'),
  validateRequest(rejectConferenceSchema),
  asyncHandler(rejectConferenceController),
);
