import { Request, Response } from 'express';
import { createFarm, registerGenericCadastro } from './cadastrosService';

export async function createFarmController(request: Request, response: Response): Promise<void> {
  const farm = await createFarm(request.body);
  response.status(201).json({ farm });
}

export async function registerGenericCadastroController(
  request: Request,
  response: Response,
): Promise<void> {
  const result = await registerGenericCadastro(
    request.params.farmId,
    request.params.cadastroType,
    request.body.data,
  );
  response.status(201).json(result);
}
