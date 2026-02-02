import { IsBoolean, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCatalogItemDto {
  @IsString()
  supplierId!: string;

  @IsString()
  supplierItemId!: string;

  @IsOptional()
  @IsBoolean()
  inherit?: boolean;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  displayDesc?: string;

  @IsOptional()
  @IsString()
  displayPhoto?: string;

  @IsNumber()
  sellPrice!: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
