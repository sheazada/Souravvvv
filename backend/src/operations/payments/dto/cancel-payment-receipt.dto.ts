import { IsString } from 'class-validator';

export class CancelPaymentReceiptDto {
  @IsString()
  reason!: string;
}
