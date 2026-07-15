import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCreditNotesDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['retailer'])
  partyType?: string;

  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsUUID()
  relatedInvoiceId?: string;

  @IsOptional()
  @IsUUID()
  relatedReturnId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
