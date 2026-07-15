import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRetailerCreditOverrideDto {
  @IsOptional()
  @IsUUID()
  salesOrderId?: string;

  @IsIn(['credit_limit_exceed', 'overdue_dispatch', 'temporary_credit_extension'])
  overrideType!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  requestedAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  approvedAmount?: number;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
