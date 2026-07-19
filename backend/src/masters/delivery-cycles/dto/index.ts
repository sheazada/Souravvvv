import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateDeliveryCycleDto {
  @IsString()
  @MaxLength(30)
  cycleCode!: string;

  @IsDateString()
  orderDate!: string;

  @IsDateString()
  deliveryDate!: string;

  @IsIn(['morning', 'evening', 'both'])
  deliveryShift!: string;

  @IsDateString()
  cutoffAt!: string;

  @IsOptional()
  @IsIn(['active', 'closed', 'consolidated'])
  status?: string;
}

export class UpdateDeliveryCycleDto {
  @IsOptional()
  @IsDateString()
  cutoffAt?: string;

  @IsOptional()
  @IsIn(['active', 'closed', 'consolidated'])
  status?: string;
}

export class QueryDeliveryCyclesDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  deliveryShift?: string;
}

export class UpdateCutoffRulesDto {
  @Type(() => Number)
  @IsNumber()
  morningCutoffHour!: number;

  @Type(() => Number)
  @IsNumber()
  morningCutoffMinute!: number;

  @Type(() => Number)
  @IsNumber()
  eveningCutoffHour!: number;

  @Type(() => Number)
  @IsNumber()
  eveningCutoffMinute!: number;
}
