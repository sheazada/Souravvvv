import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { DateRangeQueryDto } from '../../../common/dto/date-range-query.dto';

export class ReportFilterDto extends DateRangeQueryDto {
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  format?: string;
}
