import { IsOptional, IsUUID } from 'class-validator';

export class AssignDispatchResourcesDto {
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  driverEmployeeId?: string;

  @IsOptional()
  @IsUUID()
  helperEmployeeId?: string;
}
