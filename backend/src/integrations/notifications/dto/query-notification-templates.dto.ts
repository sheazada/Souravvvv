import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryNotificationTemplatesDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['sms', 'whatsapp', 'email', 'in_app'])
  channel?: string;

  @IsOptional()
  @IsString()
  eventKey?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;
}
