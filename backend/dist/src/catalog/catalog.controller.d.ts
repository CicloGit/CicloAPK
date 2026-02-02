import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { CatalogService } from './catalog.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
export declare class CatalogController {
    private readonly service;
    constructor(service: CatalogService);
    list(user: AuthenticatedUser, published?: string): Promise<any>;
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
