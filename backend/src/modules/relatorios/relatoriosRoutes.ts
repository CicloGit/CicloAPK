import { Router } from 'express';
import { authorizeRoles } from '../../shared/auth/authMiddleware';
import { asyncHandler } from '../../shared/middleware/asyncHandler';
import {
  balanceByLocalReportController,
  consumptionByLotReportController,
  gmdByLotReportController,
  locksReportController,
} from './relatoriosController';

export const relatoriosRoutes = Router();

relatoriosRoutes.get(
  '/farms/:farmId/reports/locks',
  authorizeRoles('ADMIN', 'GESTOR', 'AUDITOR', 'TECNICO'),
  asyncHandler(locksReportController),
);

relatoriosRoutes.get(
  '/farms/:farmId/reports/balance-by-local',
  authorizeRoles('ADMIN', 'GESTOR', 'AUDITOR', 'TECNICO'),
  asyncHandler(balanceByLocalReportController),
);

relatoriosRoutes.get(
  '/farms/:farmId/reports/gmd-by-lot',
  authorizeRoles('ADMIN', 'GESTOR', 'AUDITOR', 'TECNICO'),
  asyncHandler(gmdByLotReportController),
);

relatoriosRoutes.get(
  '/farms/:farmId/reports/consumption-by-lot',
  authorizeRoles('ADMIN', 'GESTOR', 'AUDITOR', 'TECNICO'),
  asyncHandler(consumptionByLotReportController),
);
