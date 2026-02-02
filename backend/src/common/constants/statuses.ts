export const REQUEST_STATUSES = ['PENDING', 'APPROVED', 'IN_PROGRESS', 'DELIVERED', 'CANCELED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
