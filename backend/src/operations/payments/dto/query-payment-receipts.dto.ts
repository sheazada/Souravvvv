import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryPaymentReceiptsDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['retailer', 'supplier'])
  partyType?: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsIn(['cash', 'upi', 'bank', 'cheque', 'card', 'net_banking'])
  paymentMode?: string;

  @IsOptional()
  @IsString()
  paymentSource?: string;

  @IsOptional()
  @IsString()
  gatewayName?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isAdvancePayment?: boolean;

  @IsOptional()
  @IsUUID()
  dispatchTripId?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
