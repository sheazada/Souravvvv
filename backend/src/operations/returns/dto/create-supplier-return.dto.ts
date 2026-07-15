import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class SupplierReturnItemDto {
  @IsOptional()
  @IsUUID()
  inventoryBatchId?: string;

  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  returnQty!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateSupplierReturnDto {
  @IsString()
  supplierReturnNo!: string;

  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsUUID()
  goodsReceiptId?: string;

  @IsDateString()
  returnDate!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  debitNoteNo?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierReturnItemDto)
  items!: SupplierReturnItemDto[];
}
