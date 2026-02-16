export type SystemRole = 'OPERADOR' | 'TECNICO' | 'GESTOR' | 'AUDITOR' | 'ADMIN';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: SystemRole;
}
