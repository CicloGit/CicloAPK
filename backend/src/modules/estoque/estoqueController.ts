import { Request, Response } from 'express';
import { consumeStock, createStockItem, stockIn } from './estoqueService';

export async function createStockItemController(request: Request, response: Response): Promise<void> {
  const result = await createStockItem(request.params.farmId, request.body);
  response.status(201).json(result);
}

export async function stockInController(request: Request, response: Response): Promise<void> {
  const result = await stockIn(request.params.farmId, request.body);
  response.status(201).json(result);
}

export async function stockConsumeController(request: Request, response: Response): Promise<void> {
  const result = await consumeStock(request.params.farmId, request.body);
  response.status(200).json(result);
}
