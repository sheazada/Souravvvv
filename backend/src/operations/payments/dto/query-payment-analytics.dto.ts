import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class QueryPaymentAnalyticsDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsUUID()
  routeId?: string;

  @IsOptional()
  @IsUUID()
  salespersonId?: string;

  @IsOptional()
  @IsUUID()
  retailerId?: string;
}
