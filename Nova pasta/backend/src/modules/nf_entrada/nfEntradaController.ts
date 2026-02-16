import { Request, Response } from 'express';
import { registerInvoiceIn } from './nfEntradaService';

export async function registerInvoiceInController(request: Request, response: Response): Promise<void> {
  const result = await registerInvoiceIn(request.params.farmId, request.body);
  response.status(201).json(result);
}
