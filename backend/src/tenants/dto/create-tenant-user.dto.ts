import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ROLES } from '../../common/constants/roles';

export class CreateTenantUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  displayName!: string;

  @IsIn(ROLES)
  role!: (typeof ROLES)[number];

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
