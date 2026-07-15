import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertRetailerCreditProfileDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  creditLimit!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  creditDays!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  warningThresholdPercent!: number;

  @IsBoolean()
  blockOrdersOnLimitExceed!: boolean;

  @IsBoolean()
  managerApprovalRequired!: boolean;

  @IsBoolean()
  allowDispatchWithOverdue!: boolean;

  @IsBoolean()
  isCreditActive!: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
