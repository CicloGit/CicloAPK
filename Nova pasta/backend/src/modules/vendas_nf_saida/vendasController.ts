import { Request, Response } from 'express';
import { createSalesOrder, issueSalesOrder } from './vendasService';

export async function createSalesOrderController(request: Request, response: Response): Promise<void> {
  const result = await createSalesOrder(request.params.farmId, request.body, request.user!);
  response.status(201).json(result);
}

export async function issueSalesOrderController(request: Request, response: Response): Promise<void> {
  await issueSalesOrder(request.params.farmId, request.params.id, request.body, request.user!);
  response.status(200).json({ message: 'Ordem emitida com sucesso.' });
}
