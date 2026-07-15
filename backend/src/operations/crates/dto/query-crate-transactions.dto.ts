import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCrateTransactionsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsUUID()
  crateTypeId?: string;

  @IsOptional()
  @IsUUID()
  dispatchTripId?: string;

  @IsOptional()
  @IsIn(['issue', 'return', 'damage', 'missing', 'adjustment'])
  transactionType?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
