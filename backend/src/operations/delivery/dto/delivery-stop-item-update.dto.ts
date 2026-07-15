import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsUUID } from 'class-validator';

export class DeliveryStopItemUpdateDto {
  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  deliveredQty!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  returnedQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  damagedQty?: number;
}
