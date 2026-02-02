import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { SupplierItemsService } from './supplier-items.service';
import { CreateSupplierItemDto } from './dto/create-supplier-item.dto';
import { UpdateSupplierItemDto } from './dto/update-supplier-item.dto';
export declare class SupplierItemsController {
    private readonly service;
    constructor(service: SupplierItemsService);
    list(user: AuthenticatedUser, supplierId?: string): Promise<any>;
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
