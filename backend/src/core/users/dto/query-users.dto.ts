import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryUsersDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  userType?: string;

  @IsOptional()
  @IsString()
  roleCode?: string;

  @IsOptional()
  @IsIn(['true', 'false', 'active', 'inactive'])
  status?: string;
}
