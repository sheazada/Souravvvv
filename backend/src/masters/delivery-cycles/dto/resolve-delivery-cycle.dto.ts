import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ResolveDeliveryCycleDto {
  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsUUID()
  routeId?: string;

  @IsDateString()
  orderTimestamp!: string;
}
