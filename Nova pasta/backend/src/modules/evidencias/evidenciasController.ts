import { Request, Response } from 'express';
import { uploadEvidence } from './evidenciasService';

export async function uploadEvidenceController(request: Request, response: Response): Promise<void> {
  const result = await uploadEvidence(request.params.farmId, request.body);
  response.status(201).json(result);
}
