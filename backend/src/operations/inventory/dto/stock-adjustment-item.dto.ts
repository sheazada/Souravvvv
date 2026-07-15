import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class StockAdjustmentItemDto {
  @IsUUID()
  variantId!: string;

  @IsOptional()
  @IsUUID()
  inventoryBatchId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  physicalQty!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
