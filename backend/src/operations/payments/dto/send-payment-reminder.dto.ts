import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendPaymentReminderDto {
  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsString()
  customMessage?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
