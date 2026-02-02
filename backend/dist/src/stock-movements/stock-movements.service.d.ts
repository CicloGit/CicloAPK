import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { FirestoreService } from '../firebase/firestore.service';
type MovementType = 'IN' | 'OUT' | 'ADJUST' | 'RESERVE' | 'RELEASE';
interface MovementInput {
    itemId: string;
    qty: number;
    type: MovementType;
    requestId?: string;
    note?: string;
}
export declare class StockMovementsService {
    private readonly firestore;
    constructor(firestore: FirestoreService);
    create(user: AuthenticatedUser, input: MovementInput): Promise<any>;
    list(user: AuthenticatedUser, supplierItemId?: string, supplierId?: string): Promise<any>;
}
export {};
