import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { REQUEST_STATUSES } from '../../common/constants/statuses';

class RequestLineDto {
  @IsString()
  catalogItemId!: string;

  @IsNumber()
  qty!: number;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  supplierItemId?: string;

  @IsOptional()
  @IsString()
  nameSnapshot?: string;

  @IsOptional()
  @IsString()
  unitSnapshot?: string;

  @IsOptional()
  @IsNumber()
  sellPriceSnapshot?: number;
}

export class CreateRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestLineDto)
  lines!: RequestLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  scheduleAt?: string;

  @IsOptional()
  @IsIn(REQUEST_STATUSES)
  status?: (typeof REQUEST_STATUSES)[number];
}
