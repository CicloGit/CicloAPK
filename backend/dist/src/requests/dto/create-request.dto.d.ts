import { REQUEST_STATUSES } from '../../common/constants/statuses';
declare class RequestLineDto {
    catalogItemId: string;
    qty: number;
    supplierId?: string;
    supplierItemId?: string;
    nameSnapshot?: string;
    unitSnapshot?: string;
    sellPriceSnapshot?: number;
}
export declare class CreateRequestDto {
    lines: RequestLineDto[];
    notes?: string;
    scheduleAt?: string;
    status?: (typeof REQUEST_STATUSES)[number];
}
export {};
