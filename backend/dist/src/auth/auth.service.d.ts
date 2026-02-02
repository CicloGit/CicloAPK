import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
export declare class AuthService {
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
