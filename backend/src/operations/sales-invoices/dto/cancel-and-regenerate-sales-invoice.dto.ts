import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SalesInvoiceRevisionItemDto } from './sales-invoice-revision-item.dto';

export class CancelAndRegenerateSalesInvoiceDto {
  @IsString()
  reason!: string;

  @IsIn(['manual', 'delivery_actuals'])
  source!: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesInvoiceRevisionItemDto)
  items?: SalesInvoiceRevisionItemDto[];
}
