import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class RunPaymentRemindersDto {
  @IsOptional()
  @IsDateString()
  runAt?: string;

  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
