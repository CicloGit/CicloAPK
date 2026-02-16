import { Request, Response } from 'express';
import { launchFeed } from './alimentacaoService';

export async function launchFeedController(request: Request, response: Response): Promise<void> {
  const result = await launchFeed(request.params.farmId, request.body, request.user!);
  response.status(201).json(result);
}
