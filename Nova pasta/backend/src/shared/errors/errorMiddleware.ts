import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApplicationError } from './ApplicationError';

export function notFoundHandler(_request: Request, response: Response): void {
  response.status(404).json({ message: 'Rota nao encontrada.' });
}

export function errorMiddleware(error: unknown, _request: Request, response: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: 'Erro de validacao.',
      details: error.errors,
    });
    return;
  }

  if (error instanceof ApplicationError) {
    response.status(error.statusCode).json({
      message: error.message,
      code: error.code,
    });
    return;
  }

  response.status(500).json({
    message: 'Erro interno do servidor.',
  });
}
