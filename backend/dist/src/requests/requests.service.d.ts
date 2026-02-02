import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { FirestoreService } from '../firebase/firestore.service';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { StockBalanceService } from '../stock-balance/stock-balance.service';
export declare class RequestsService {
    private readonly firestore;
    private readonly stockBalances;
    constructor(firestore: FirestoreService, stockBalances: StockBalanceService);
    list(tenantId: string): Promise<any>;
    listMine(user: AuthenticatedUser): Promise<any>;
    private decorateLegacy;
    create(user: AuthenticatedUser, dto: any): Promise<{
        lines: any[];
        notes: any;
        scheduleAt: any;
        status: any;
        statusHistory: {
            status: any;
            at: string;
            byUid: string;
        }[];
        tenantId: string;
        requesterUid: string;
        createdAt: string;
        id: any;
    }>;
    private prepareLines;
    updateStatus(user: AuthenticatedUser, requestId: string, dto: UpdateRequestStatusDto): Promise<any>;
}
