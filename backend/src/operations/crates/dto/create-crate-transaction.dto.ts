import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateCrateTransactionDto {
  @IsUUID()
  crateTypeId!: string;

  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsUUID()
  dispatchTripId?: string;

  @IsOptional()
  @IsUUID()
  deliveryStopId?: string;

  @IsIn(['issue', 'return', 'damage', 'missing', 'adjustment'])
  transactionType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

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
