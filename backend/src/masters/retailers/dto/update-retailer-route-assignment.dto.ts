import { IsOptional, IsUUID, Matches } from 'class-validator';

export class UpdateRetailerRouteAssignmentDto {
  @IsOptional()
  @IsUUID()
  assignedRouteId?: string;

  @IsOptional()
  @IsUUID()
  assignedSalespersonId?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  preferredDeliveryStart?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  preferredDeliveryEnd?: string;
}
