import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdjustAdvanceWalletDto {
  @IsIn(['advance_credit', 'advance_use', 'refund', 'adjustment'])
  transactionType!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  debitAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  creditAmount?: number;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
