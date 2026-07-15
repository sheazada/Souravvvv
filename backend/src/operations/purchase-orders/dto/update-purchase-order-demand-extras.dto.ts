import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsUUID, ValidateNested } from 'class-validator';

class UpdatePurchaseOrderDemandExtraItemDto {
  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  extraQty!: number;
}

export class UpdatePurchaseOrderDemandExtrasDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdatePurchaseOrderDemandExtraItemDto)
  items!: UpdatePurchaseOrderDemandExtraItemDto[];
}
