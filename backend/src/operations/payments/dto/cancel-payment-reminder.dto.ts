import { IsString } from 'class-validator';

export class CancelPaymentReminderDto {
  @IsString()
  reason!: string;
}
