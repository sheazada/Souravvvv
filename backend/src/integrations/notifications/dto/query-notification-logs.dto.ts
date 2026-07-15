import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryNotificationLogsDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['sms', 'whatsapp', 'email', 'in_app'])
  channel?: string;

  @IsOptional()
  @IsIn(['queued', 'sent', 'failed'])
  status?: string;

  @IsOptional()
  @IsString()
  eventKey?: string;
}
