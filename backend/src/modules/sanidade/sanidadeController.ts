import { Request, Response } from 'express';
import { launchHealth } from './sanidadeService';

export async function launchHealthController(request: Request, response: Response): Promise<void> {
  const result = await launchHealth(request.params.farmId, request.body, request.user!);
  response.status(201).json(result);
}
