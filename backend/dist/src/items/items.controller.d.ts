import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
export declare class ItemsController {
    private readonly itemsService;
    constructor(itemsService: ItemsService);
    list(user: AuthenticatedUser): Promise<any>;
    create(dto: CreateItemDto, user: AuthenticatedUser): Promise<{
        name: string;
        category: string;
        unit: string;
        price: number | null;
        photoUrl: string | null;
        minStock: number | null;
        active: boolean;
        tenantId: string;
        createdAt: string;
        createdBy: string;
        onHand: number;
        reserved: number;
        available: number;
        id: any;
    }>;
    update(id: string, dto: UpdateItemDto, user: AuthenticatedUser): Promise<any>;
    remove(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        deleted: boolean;
    }>;
}
