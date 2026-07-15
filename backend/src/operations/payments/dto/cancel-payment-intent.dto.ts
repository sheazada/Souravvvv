import { IsOptional, IsString } from 'class-validator';

export class CancelPaymentIntentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
