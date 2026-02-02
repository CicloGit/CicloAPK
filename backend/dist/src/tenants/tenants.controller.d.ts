import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { TenantsService } from './tenants.service';
export declare class TenantsController {
    private readonly tenantsService;
    constructor(tenantsService: TenantsService);
    currentTenant(user: AuthenticatedUser): Promise<{
        tenantId: string;
        accessibleModules: string[];
        user: {
            uid: string;
            role: "owner" | "admin" | "technician" | "client_user" | "supplier";
            email: string | undefined;
        };
    }>;
    listUsers(user: AuthenticatedUser): Promise<any>;
    createTenantUser(dto: CreateTenantUserDto, user: AuthenticatedUser): Promise<{
        tempPassword: string;
        uid: string;
        email: string;
        displayName: string;
        role: "owner" | "admin" | "technician" | "client_user" | "supplier";
        phone: string | null;
        tenantId: string;
        createdBy: string;
        createdAt: string;
        active: boolean;
        inviteStatus: string;
    }>;
}
