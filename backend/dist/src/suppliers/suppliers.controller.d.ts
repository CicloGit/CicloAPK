import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    list(user: AuthenticatedUser): Promise<any>;
    create(dto: CreateSupplierDto, user: AuthenticatedUser): Promise<{
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
