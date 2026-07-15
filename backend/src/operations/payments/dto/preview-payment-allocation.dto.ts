import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class PreviewPaymentAllocationDto {
  @IsUUID()
  retailerId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsOptional()
  @IsString()
  paymentContext?: string;

  @IsIn(['fifo', 'manual', 'advance'])
  allocationMode!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedInvoiceIds?: string[];
}
