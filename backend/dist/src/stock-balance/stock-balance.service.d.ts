import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { FirestoreService } from '../firebase/firestore.service';
export type BalanceInput = {
    supplierId: string;
    supplierItemId: string;
    qty: number;
    type: 'IN' | 'OUT' | 'RESERVE' | 'RELEASE' | 'ADJUST';
    requestId?: string;
    supplierOrderId?: string;
    note?: string;
};
export declare class StockBalanceService {
    private readonly firestore;
    constructor(firestore: FirestoreService);
    private balanceId;
    list(tenantId: string, supplierId?: string): Promise<any>;
    movement(user: AuthenticatedUser, input: BalanceInput): Promise<any>;
    setMinStock(user: AuthenticatedUser, supplierId: string, supplierItemId: string, minStock: number): Promise<{
        id: string;
        minStock: number;
        lowStock: boolean;
    }>;
}
