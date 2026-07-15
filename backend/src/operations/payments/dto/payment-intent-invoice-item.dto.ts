import { Type } from 'class-transformer';
import { IsNumber, IsUUID } from 'class-validator';

export class PaymentIntentInvoiceItemDto {
  @IsUUID()
  invoiceId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  targetAmount!: number;
}
