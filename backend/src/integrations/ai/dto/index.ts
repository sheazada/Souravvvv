import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class OcrInvoiceDto {
  @IsString()
  rawTextOrImageUrl!: string;

  @IsOptional()
  @IsUUID()
  supplierId?: string;
}

export class VoiceOrderDto {
  @IsString()
  transcript!: string;

  @IsOptional()
  @IsUUID()
  retailerId?: string;
}

export class AssistantQueryDto {
  @IsString()
  queryText!: string;
}

export class CreateForecastRunDto {
  @IsString()
  forecastName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  forecastDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  growthFactorPercentage?: number;
}

export class QueryForecastsDto extends PaginationQueryDto {}
