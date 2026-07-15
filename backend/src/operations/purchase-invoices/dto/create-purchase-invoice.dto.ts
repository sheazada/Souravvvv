import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class PurchaseInvoiceItemDto {
  @IsOptional()
  @IsUUID()
  goodsReceiptItemId?: string;

  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  billedQty!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxAmount?: number;
}

export class CreatePurchaseInvoiceDto {
  @IsString()
  invoiceNo!: string;

  @IsOptional()
  @IsString()
  internalVoucherNo?: string;

  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsUUID()
  goodsReceiptId?: string;

  @IsDateString()
  invoiceDate!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseInvoiceItemDto)
  items!: PurchaseInvoiceItemDto[];
}
