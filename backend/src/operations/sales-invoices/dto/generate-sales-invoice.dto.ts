import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class CustomInvoiceItemDto {
  @IsUUID()
  variantId!: string;

  @IsNumber()
  @Min(0.001)
  billedQty!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class GenerateSalesInvoiceDto {
  @IsUUID()
  retailerId!: string;

  @IsOptional()
  @IsUUID()
  salesOrderId?: string;

  @IsOptional()
  @IsUUID()
  dispatchTripId?: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(['auto_delivery', 'admin_manual', 'assisted_billing'])
  source?: string;

  @IsOptional()
  @IsIn(['draft', 'posted'])
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomInvoiceItemDto)
  items?: CustomInvoiceItemDto[];

  @IsOptional()
  @IsIn(['cash', 'upi', 'card', 'credit'])
  paymentMode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountReceived?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
