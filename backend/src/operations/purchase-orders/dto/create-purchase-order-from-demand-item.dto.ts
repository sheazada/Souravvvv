import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreatePurchaseOrderFromDemandItemDto {
  @IsUUID()
  variantId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  extraQty?: number;
}
