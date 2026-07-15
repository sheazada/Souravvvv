import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryDemandConsolidationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  deliveryCycleId?: string;

  @IsOptional()
  @IsIn(['draft', 'reviewed', 'approved', 'po_generated'])
  status?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
