import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class GenerateDispatchTripDto {
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

  @IsOptional()
  @IsDateString()
  dispatchDate?: string;
}
