import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreatePriceBookDto {
  @IsString()
  @MaxLength(30)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsIn(['default', 'tier_1', 'tier_2', 'special', 'seasonal'])
  bookType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePromotionDto {
  @IsString()
  @MaxLength(30)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsIn(['percentage_off', 'flat_discount', 'buy_x_get_y'])
  discountType!: string;

  @Type(() => Number)
  @IsNumber()
  discountValue!: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PricingPreviewDto {
  @IsUUID()
  retailerId!: string;

  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsNumber()
  qty!: number;
}

export class QueryPricingDto extends PaginationQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
