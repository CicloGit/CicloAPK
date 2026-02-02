import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { FirestoreService } from '../firebase/firestore.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
export declare class ItemsService {
    private readonly firestore;
    constructor(firestore: FirestoreService);
    list(tenantId: string): Promise<any>;
    create(user: AuthenticatedUser, dto: CreateItemDto): Promise<{
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
    update(user: AuthenticatedUser, id: string, dto: UpdateItemDto): Promise<any>;
    remove(user: AuthenticatedUser, id: string): Promise<{
        id: string;
        deleted: boolean;
    }>;
}
