import { IsBooleanString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryRetailersDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @IsOptional()
  @IsUUID()
  salespersonId?: string;

  @IsOptional()
  @IsString()
  retailerCategory?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'blocked', 'seasonal', 'under_review'])
  businessStatus?: string;

  @IsOptional()
  @IsIn(['self_service', 'assisted', 'hybrid'])
  orderingMode?: string;

  @IsOptional()
  @IsBooleanString()
  isOrderingEnabled?: string;
}
