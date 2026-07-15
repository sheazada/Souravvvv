import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateRetailerCreditNoteDto {
  @IsIn(['retailer'])
  partyType!: string;

  @IsUUID()
  partyId!: string;

  @IsUUID()
  retailerId!: string;

  @IsOptional()
  @IsUUID()
  relatedInvoiceId?: string;

  @IsDateString()
  noteDate!: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsIn(['draft', 'posted'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  affectsLedger?: boolean;

  @IsOptional()
  @IsBoolean()
  affectsInvoiceBalance?: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}
