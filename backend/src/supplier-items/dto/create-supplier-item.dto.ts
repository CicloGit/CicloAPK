import { IsBoolean, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSupplierItemDto {
  @IsString()
  @MinLength(2)
  supplierId!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(1)
  unit!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  minStock?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
