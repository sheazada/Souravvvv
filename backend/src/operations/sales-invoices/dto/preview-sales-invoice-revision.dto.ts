import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SalesInvoiceRevisionItemDto } from './sales-invoice-revision-item.dto';

export class PreviewSalesInvoiceRevisionDto {
  @IsIn(['manual', 'from_delivery_actuals'])
  revisionMode!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsDateString()
  newInvoiceDate?: string;

  @IsOptional()
  @IsDateString()
  newDueDate?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesInvoiceRevisionItemDto)
  items?: SalesInvoiceRevisionItemDto[];
}
