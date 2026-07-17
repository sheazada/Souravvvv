import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsMobilePhone, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(30)
  employeeCode!: string;

  @IsString()
  @MaxLength(150)
  fullName!: string;

  @IsOptional()
  @IsIn(['driver', 'salesperson', 'loader', 'accountant', 'manager'])
  designation?: string;

  @IsOptional()
  @IsMobilePhone('en-IN')
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  drivingLicenseNo?: string;

  @IsOptional()
  @IsUUID()
  assignedRouteId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  drivingLicenseNo?: string;

  @IsOptional()
  @IsUUID()
  assignedRouteId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryEmployeesDto extends PaginationQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
