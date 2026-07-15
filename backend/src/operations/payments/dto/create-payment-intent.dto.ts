import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PaymentIntentInvoiceItemDto } from './payment-intent-invoice-item.dto';

export class CreatePaymentIntentDto {
  @IsUUID()
  retailerId!: string;

  @IsIn([
    'single_invoice',
    'multi_invoice',
    'full_outstanding',
    'custom_amount',
    'advance_payment',
  ])
  paymentContext!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsOptional()
  @IsString()
  gatewayName?: string;

  @IsOptional()
  @IsIn(['fifo', 'manual', 'advance'])
  allocationMode?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentIntentInvoiceItemDto)
  selectedInvoices?: PaymentIntentInvoiceItemDto[];

  @IsOptional()
  @IsString()
  returnUrl?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
