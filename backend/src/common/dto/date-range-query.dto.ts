import { IsDateString, IsOptional } from 'class-validator';

export class DateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
