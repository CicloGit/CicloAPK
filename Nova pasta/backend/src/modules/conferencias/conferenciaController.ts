import { Request, Response } from 'express';
import {
  approveConference,
  countConference,
  openConference,
  rejectConference,
} from './conferenciaService';

export async function openConferenceController(request: Request, response: Response): Promise<void> {
  const result = await openConference(request.params.farmId, request.body, request.user!);
  response.status(201).json(result);
}

export async function countConferenceController(request: Request, response: Response): Promise<void> {
  await countConference(request.params.farmId, request.params.id, request.body, request.user!);
  response.status(200).json({ message: 'Contagem registrada.' });
}

export async function approveConferenceController(request: Request, response: Response): Promise<void> {
  const result = await approveConference(request.params.farmId, request.params.id, request.body, request.user!);
  response.status(200).json(result);
}

export async function rejectConferenceController(request: Request, response: Response): Promise<void> {
  await rejectConference(request.params.farmId, request.params.id, request.body, request.user!);
  response.status(200).json({ message: 'Conferencia reprovada.' });
}
