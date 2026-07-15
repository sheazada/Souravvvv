import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePaymentAllocationDto {
  @IsOptional()
  @IsUUID()
  salesInvoiceId?: string;

  @IsOptional()
  @IsUUID()
  purchaseInvoiceId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  allocatedAmount!: number;

  @IsDateString()
  allocationDate!: string;

  @IsOptional()
  @IsIn(['fifo', 'manual', 'advance'])
  allocationMode?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
