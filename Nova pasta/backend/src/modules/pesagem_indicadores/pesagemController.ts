import { Request, Response } from 'express';
import { registerWeighing } from './pesagemService';

export async function registerWeighingController(request: Request, response: Response): Promise<void> {
  const result = await registerWeighing(request.params.farmId, request.body, request.user!);
  response.status(201).json(result);
}
