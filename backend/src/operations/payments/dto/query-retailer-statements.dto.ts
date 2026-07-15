import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsOptional } from 'class-validator';

export class QueryRetailerStatementsDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsIn(['json', 'pdf', 'xlsx', 'print'])
  format?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeZeroBalance?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeCancelled?: boolean;
}
