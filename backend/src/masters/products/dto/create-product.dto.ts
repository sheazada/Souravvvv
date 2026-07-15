import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductDto {
  @IsString()
  productCode!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  taxCodeId?: string;

  @IsOptional()
  @IsBoolean()
  isBatchTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  isExpiryTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  isReturnable?: boolean;

  @IsOptional()
  @IsUUID()
  defaultCrateTypeId?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
