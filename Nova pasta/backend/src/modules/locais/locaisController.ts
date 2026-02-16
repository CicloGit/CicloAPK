import { Request, Response } from 'express';
import { createLocal } from './locaisService';

export async function createLocalController(request: Request, response: Response): Promise<void> {
  const result = await createLocal(request.params.farmId, request.body);
  response.status(201).json(result);
}
