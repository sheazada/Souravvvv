import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class ApplyWalletBalanceDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsIn(['fifo', 'manual', 'advance'])
  allocationMode!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedInvoiceIds?: string[];
}
