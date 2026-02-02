import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { StockMovementsService } from './stock-movements.service';
export declare class StockMovementsController {
    private readonly movements;
    constructor(movements: StockMovementsService);
    list(user: AuthenticatedUser, supplierItemId?: string, supplierId?: string): Promise<any>;
}
