import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CheckRetailerCreditDto {
  @IsIn(['order_approval', 'invoice_posting', 'dispatch_release', 'manual_credit_review'])
  context!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  transactionAmount?: number;

  @IsOptional()
  @IsUUID()
  salesOrderId?: string;

  @IsOptional()
  @IsUUID()
  salesInvoiceId?: string;

  @IsOptional()
  @IsUUID()
  dispatchTripId?: string;
}
