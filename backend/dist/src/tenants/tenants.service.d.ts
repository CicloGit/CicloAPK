import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { FirestoreService } from '../firebase/firestore.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
export declare class TenantsService {
    private readonly firestore;
    private readonly firebaseAdmin;
    constructor(firestore: FirestoreService, firebaseAdmin: FirebaseAdminService);
    getTenantSummary(user: AuthenticatedUser): Promise<{
        tenantId: string;
        accessibleModules: string[];
        user: {
            uid: string;
            role: "owner" | "admin" | "technician" | "client_user" | "supplier";
            email: string | undefined;
        };
    }>;
    listTenantUsers(tenantId: string): Promise<any>;
    createTenantUser(requestor: AuthenticatedUser, payload: CreateTenantUserDto): Promise<{
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
    private getModulesByRole;
}
