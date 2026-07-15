import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QuerySalesOrdersDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['draft', 'pending', 'approved', 'packed', 'dispatched', 'delivered', 'partial', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsIn(['retailer', 'admin', 'salesperson', 'import'])
  source?: string;

  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsUUID()
  routeId?: string;

  @IsOptional()
  @IsUUID()
  deliveryCycleId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
