import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDispatchTripDto {
  @IsUUID()
  deliveryCycleId!: string;

  @IsUUID()
  routeId!: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  driverEmployeeId?: string;

  @IsOptional()
  @IsUUID()
  helperEmployeeId?: string;

  @IsDateString()
  dispatchDate!: string;

  @IsOptional()
  @IsDateString()
  plannedStartAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
