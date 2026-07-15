import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateRetailerNoteThresholdsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  creditNoteMaxAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  creditNoteMaxTaxAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  creditNoteMaxTotalAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  debitNoteMaxAmount?: number;
}
