import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateVehicleDto {
  @IsString()
  @MaxLength(30)
  vehicleNo!: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacityCrates?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacityWeightKg?: number;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsString()
  ownershipType?: string;

  @IsOptional()
  @IsUUID()
  driverEmployeeId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacityCrates?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  capacityWeightKg?: number;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsString()
  ownershipType?: string;

  @IsOptional()
  @IsUUID()
  driverEmployeeId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryVehiclesDto extends PaginationQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
