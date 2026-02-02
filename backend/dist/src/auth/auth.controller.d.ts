import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    me(user: AuthenticatedUser): {
        uid: string;
        email: string | undefined;
        displayName: string | undefined;
        role: "owner" | "admin" | "technician" | "client_user" | "supplier";
        tenantId: string;
        permissions: string[];
        metadata: Record<string, any>;
    };
}
