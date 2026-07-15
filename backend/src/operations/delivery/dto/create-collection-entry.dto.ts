import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { CollectionAllocationItemDto } from '../../payments/dto/collection-allocation-item.dto';

export class CreateCollectionEntryDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @IsIn(['cash', 'upi', 'bank', 'cheque', 'card', 'net_banking'])
  paymentMode!: string;

  @IsOptional()
  @IsUUID()
  salesInvoiceId?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['fifo', 'manual', 'advance'])
  allocationMode?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CollectionAllocationItemDto)
  salesInvoiceAllocations?: CollectionAllocationItemDto[];

  @IsOptional()
  @IsUUID()
  receiptFileAttachmentId?: string;

  @IsOptional()
  @IsUUID()
  signatureFileAttachmentId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  markAsAdvanceIfUnallocated?: boolean;
}
