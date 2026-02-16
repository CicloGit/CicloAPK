import { Request, Response } from 'express';
import {
  changeAnimalStage,
  createAnimal,
  registerBirth,
  registerPurchase,
  transferAnimal,
} from './rebanhoService';

export async function createAnimalController(request: Request, response: Response): Promise<void> {
  const result = await createAnimal(request.params.farmId, request.body, request.user!);
  response.status(201).json(result);
}

export async function registerBirthController(request: Request, response: Response): Promise<void> {
  const result = await registerBirth(request.params.farmId, request.body, request.user!);
  response.status(201).json(result);
}

export async function registerPurchaseController(request: Request, response: Response): Promise<void> {
  const result = await registerPurchase(request.params.farmId, request.body, request.user!);
  response.status(201).json(result);
}

export async function transferAnimalController(request: Request, response: Response): Promise<void> {
  await transferAnimal(request.params.farmId, request.body, request.user!);
  response.status(200).json({ message: 'Transferencia concluida.' });
}

export async function changeAnimalStageController(request: Request, response: Response): Promise<void> {
  await changeAnimalStage(request.params.farmId, request.params.animalId, request.body);
  response.status(200).json({ message: 'Estagio alterado com sucesso.' });
}
