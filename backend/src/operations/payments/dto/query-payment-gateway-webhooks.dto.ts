import { IsDateString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryPaymentGatewayWebhooksDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  gatewayName?: string;

  @IsOptional()
  @IsString()
  processedStatus?: string;

  @IsOptional()
  @IsString()
  verificationStatus?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
