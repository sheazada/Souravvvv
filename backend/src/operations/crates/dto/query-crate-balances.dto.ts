import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCrateBalancesDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsUUID()
  crateTypeId?: string;

  @IsOptional()
  @IsDateString()
  balanceDate?: string;
}
