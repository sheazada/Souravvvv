import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ManualReceiptAllocationItemDto } from './manual-receipt-allocation-item.dto';

export class CreatePaymentReceiptDto {
  @IsIn(['retailer', 'supplier'])
  partyType!: string;

  @IsUUID()
  partyId!: string;

  @IsIn(['inbound', 'outbound'])
  paymentDirection!: string;

  @IsIn(['cash', 'upi', 'bank', 'cheque', 'card', 'net_banking'])
  paymentMode!: string;

  @IsDateString()
  paymentDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsOptional()
  @IsUUID()
  dispatchTripId?: string;

  @IsOptional()
  @IsUUID()
  bankAccountId?: string;

  @IsOptional()
  @IsUUID()
  cashRegisterId?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsIn(['retailer_portal', 'delivery_staff', 'admin_entry', 'gateway_webhook', 'system_adjustment'])
  paymentSource?: string;

  @IsOptional()
  @IsUUID()
  paymentIntentId?: string;

  @IsOptional()
  @IsString()
  gatewayName?: string;

  @IsOptional()
  @IsString()
  gatewayPaymentId?: string;

  @IsOptional()
  @IsString()
  gatewayOrderId?: string;

  @IsOptional()
  @IsBoolean()
  isAdvancePayment?: boolean;

  @IsOptional()
  @IsString()
  receiptFileUrl?: string;

  @IsOptional()
  @IsString()
  signatureFileUrl?: string;

  @IsOptional()
  @IsBoolean()
  autoConfirm?: boolean;

  @IsOptional()
  @IsIn(['fifo', 'manual', 'advance'])
  allocationMode?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ManualReceiptAllocationItemDto)
  salesInvoiceAllocations?: ManualReceiptAllocationItemDto[];
}
