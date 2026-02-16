import { NextFunction, Request, Response } from 'express';
import { ApplicationError } from '../errors/ApplicationError';
import { AuthenticatedUser, SystemRole } from './types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const validRoles: SystemRole[] = ['OPERADOR', 'TECNICO', 'GESTOR', 'AUDITOR', 'ADMIN'];

export function authenticateRequest(request: Request, _response: Response, next: NextFunction): void {
  const roleHeader = String(request.headers['x-user-role'] ?? '').toUpperCase();
  const userIdHeader = String(request.headers['x-user-id'] ?? '').trim();
  const userNameHeader = String(request.headers['x-user-name'] ?? 'Usuario API').trim();

  if (!roleHeader || !userIdHeader) {
    throw new ApplicationError('Cabecalhos x-user-role e x-user-id sao obrigatorios.', 401, 'UNAUTHORIZED');
  }

  if (!validRoles.includes(roleHeader as SystemRole)) {
    throw new ApplicationError('Papel de usuario invalido.', 403, 'INVALID_ROLE');
  }

  request.user = {
    id: userIdHeader,
    name: userNameHeader,
    role: roleHeader as SystemRole,
  };

  next();
}

export function authorizeRoles(...roles: SystemRole[]) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      throw new ApplicationError('Usuario nao autenticado.', 401, 'UNAUTHORIZED');
    }
    if (!roles.includes(request.user.role)) {
      throw new ApplicationError('Usuario sem permissao para esta operacao.', 403, 'FORBIDDEN');
    }
    next();
  };
}
