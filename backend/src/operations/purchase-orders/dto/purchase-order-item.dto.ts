import { Type } from 'class-transformer';
import { IsNumber, IsUUID } from 'class-validator';

export class PurchaseOrderItemDto {
  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  orderedQty!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  unitCost!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  taxRate!: number;
}
