import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class QueryCollectionsTrendDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsIn(['day', 'week', 'month'])
  groupBy!: string;
}
