import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateRouteDto {
  @IsString()
  @MaxLength(30)
  code!: string;

  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsIn(['morning', 'evening', 'both'])
  deliveryShift?: string;

  @IsOptional()
  @IsString()
  defaultCutoffTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsIn(['morning', 'evening', 'both'])
  deliveryShift?: string;

  @IsOptional()
  @IsString()
  defaultCutoffTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryRoutesDto extends PaginationQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
