import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
export declare class RequestsController {
    private readonly requestsService;
    constructor(requestsService: RequestsService);
    list(user: AuthenticatedUser, scope?: string): Promise<any>;
    create(dto: CreateRequestDto, user: AuthenticatedUser): Promise<{
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
    updateStatus(id: string, dto: UpdateRequestStatusDto, user: AuthenticatedUser): Promise<any>;
}
