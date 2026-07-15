import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRetailerDebitNoteDto {
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
  @IsBoolean()
  affectsLedger?: boolean;

  @IsOptional()
  @IsBoolean()
  affectsInvoiceBalance?: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}
