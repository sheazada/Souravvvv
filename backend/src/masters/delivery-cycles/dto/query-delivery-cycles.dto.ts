import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryDeliveryCyclesDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsIn(['morning', 'evening'])
  deliveryShift?: string;

  @IsOptional()
  @IsIn(['open', 'closed', 'planned', 'dispatched', 'completed'])
  status?: string;
}
