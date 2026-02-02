import { FirestoreService } from '../firebase/firestore.service';
import { CreateSupplierItemDto } from './dto/create-supplier-item.dto';
import { UpdateSupplierItemDto } from './dto/update-supplier-item.dto';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
export declare class SupplierItemsService {
    private readonly firestore;
    constructor(firestore: FirestoreService);
    list(tenantId: string, supplierId?: string): Promise<any>;
    create(user: AuthenticatedUser, dto: CreateSupplierItemDto): Promise<{
        tenantId: string;
        supplierId: string;
        name: string;
        unit: string;
        category: string | null;
        photoUrl: string | null;
        costPrice: number | null;
        minStock: number | null;
        active: boolean;
        createdAt: string;
        createdBy: string;
        id: any;
        supplierItemId: any;
    }>;
    update(user: AuthenticatedUser, id: string, dto: UpdateSupplierItemDto): Promise<any>;
}
