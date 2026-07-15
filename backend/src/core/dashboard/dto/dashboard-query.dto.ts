import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';

export class DashboardQueryDto extends DateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  routeId?: string;
}
