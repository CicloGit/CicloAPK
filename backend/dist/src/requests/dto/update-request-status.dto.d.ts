import { REQUEST_STATUSES } from '../../common/constants/statuses';
export declare class UpdateRequestStatusDto {
    status: (typeof REQUEST_STATUSES)[number];
    requestId: string;
}
