import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { SupplierReturnItemDto } from './create-supplier-return.dto';

export class UpdateSupplierReturnDto {
  @IsOptional()
  @IsString()
  supplierReturnNo?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  goodsReceiptId?: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  debitNoteNo?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierReturnItemDto)
  items?: SupplierReturnItemDto[];
}
