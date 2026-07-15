import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { SalesOrderItemDto } from './sales-order-item.dto';

export class CreateSalesOrderDto {
  @IsUUID()
  retailerId!: string;

  @IsOptional()
  @IsUUID()
  routeId?: string;

  @IsOptional()
  @IsDateString()
  requestedDeliveryDate?: string;

  @IsOptional()
  @IsIn(['retailer', 'admin', 'salesperson', 'import'])
  source?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderItemDto)
  items!: SalesOrderItemDto[];
}
