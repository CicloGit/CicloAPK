import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { FirestoreService } from '../firebase/firestore.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
export declare class SuppliersService {
    private readonly firestore;
    constructor(firestore: FirestoreService);
    list(tenantId: string): Promise<any>;
    create(user: AuthenticatedUser, payload: CreateSupplierDto): Promise<{
        name: string;
        email: string | null;
        contact: string | null;
        items: string[];
        tenantId: string;
        createdBy: string;
        createdAt: string;
        status: string;
        id: any;
    }>;
}
