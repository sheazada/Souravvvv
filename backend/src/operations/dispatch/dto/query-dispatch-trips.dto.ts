import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryDispatchTripsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @IsOptional()
  @IsUUID()
  deliveryCycleId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsIn(['planned', 'loaded', 'dispatched', 'in_transit', 'completed', 'reconciled', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsDateString()
  dispatchDate?: string;
}
