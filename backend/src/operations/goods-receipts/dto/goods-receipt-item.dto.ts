import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class GoodsReceiptItemDto {
  @IsOptional()
  @IsUUID()
  purchaseOrderItemId?: string;

  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  orderedQty!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  receivedQty!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  acceptedQty!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  rejectedQty!: number;

  @IsOptional()
  @IsString()
  batchNo?: string;

  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  unitCost!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
