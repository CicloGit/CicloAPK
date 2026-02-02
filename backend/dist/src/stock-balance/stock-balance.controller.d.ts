import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { StockBalanceService, type BalanceInput } from './stock-balance.service';
export declare class StockBalanceController {
    private readonly service;
    constructor(service: StockBalanceService);
    list(user: AuthenticatedUser, supplierId?: string): Promise<any>;
    move(user: AuthenticatedUser, body: BalanceInput): Promise<any>;
}
