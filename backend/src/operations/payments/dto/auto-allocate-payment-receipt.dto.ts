import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';

export class AutoAllocatePaymentReceiptDto {
  @IsDateString()
  allocationDate!: string;

  @IsOptional()
  @IsIn(['fifo', 'advance'])
  allocationMode?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedInvoiceIds?: string[];

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  treatRemainingAsAdvance?: boolean;
}
