import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

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
  @IsString()
  remarks?: string;
}
