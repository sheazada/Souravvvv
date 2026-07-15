import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { GoodsReceiptItemDto } from './goods-receipt-item.dto';

export class CreateGoodsReceiptDto {
  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;

  @IsUUID()
  warehouseId!: string;

  @IsDateString()
  receiptDate!: string;

  @IsOptional()
  @IsString()
  supplierChallanNo?: string;

  @IsOptional()
  @IsString()
  vehicleNo?: string;

  @IsOptional()
  @IsUUID()
  receivedByEmployeeId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items!: GoodsReceiptItemDto[];
}
