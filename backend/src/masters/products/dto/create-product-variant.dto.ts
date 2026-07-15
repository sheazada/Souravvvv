import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProductVariantDto {
  @IsUUID()
  productId!: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  variantName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  sizeValue?: number;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  mrp!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  distributorPrice!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  defaultRetailerPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  offerPrice?: number;

  @IsOptional()
  @IsString()
  status?: string;
}
