export const ROLES = ['owner', 'admin', 'technician', 'client_user', 'supplier'] as const;

export type Role = (typeof ROLES)[number];
