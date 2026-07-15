import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryRolesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  isSystemRole?: string;
}
