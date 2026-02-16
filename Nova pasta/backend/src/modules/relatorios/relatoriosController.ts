import { Request, Response } from 'express';
import {
  getActiveLocksReport,
  getBalanceByLocalReport,
  getConsumptionByLotReport,
  getGmdByLotReport,
} from './relatoriosService';

export async function locksReportController(request: Request, response: Response): Promise<void> {
  const data = await getActiveLocksReport(request.params.farmId);
  response.status(200).json({ data });
}

export async function balanceByLocalReportController(
  request: Request,
  response: Response,
): Promise<void> {
  const data = await getBalanceByLocalReport(request.params.farmId);
  response.status(200).json({ data });
}

export async function gmdByLotReportController(request: Request, response: Response): Promise<void> {
  const data = await getGmdByLotReport(request.params.farmId);
  response.status(200).json({ data });
}

export async function consumptionByLotReportController(
  request: Request,
  response: Response,
): Promise<void> {
  const data = await getConsumptionByLotReport(request.params.farmId);
  response.status(200).json({ data });
}
