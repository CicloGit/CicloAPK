import { FirestoreService } from '../firebase/firestore.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
export declare class CatalogService {
    private readonly firestore;
    constructor(firestore: FirestoreService);
    listForTenant(user: AuthenticatedUser, publishedOnly?: boolean): Promise<any>;
    create(user: AuthenticatedUser, dto: CreateCatalogItemDto): Promise<{
        tenantId: string;
        supplierId: string;
        supplierItemId: string;
        inherit: boolean;
        displayName: string | null;
        displayDesc: string | null;
        displayPhoto: string | null;
        sellPrice: number;
        published: boolean;
        createdAt: string;
        createdBy: string;
        id: any;
        catalogItemId: any;
    }>;
    update(user: AuthenticatedUser, id: string, dto: UpdateCatalogItemDto): Promise<any>;
}
