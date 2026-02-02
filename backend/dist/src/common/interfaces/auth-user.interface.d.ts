import { Role } from '../constants/roles';
export interface AuthenticatedUser {
    uid: string;
    email?: string;
    displayName?: string;
    role: Role;
    tenantId: string;
    permissions?: string[];
    metadata?: Record<string, any>;
}
