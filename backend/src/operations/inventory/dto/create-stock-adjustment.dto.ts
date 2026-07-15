import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { StockAdjustmentItemDto } from './stock-adjustment-item.dto';

export class CreateStockAdjustmentDto {
  @IsUUID()
  warehouseId!: string;

  @IsDateString()
  adjustmentDate!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockAdjustmentItemDto)
  items!: StockAdjustmentItemDto[];
}
