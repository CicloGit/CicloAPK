import { ROLES } from '../../common/constants/roles';
export declare class CreateTenantUserDto {
    email: string;
    displayName: string;
    role: (typeof ROLES)[number];
    phone?: string;
    password?: string;
}
