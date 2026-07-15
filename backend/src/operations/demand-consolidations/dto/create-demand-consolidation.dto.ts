import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDemandConsolidationDto {
  @IsUUID()
  deliveryCycleId!: string;

  @IsOptional()
  @IsArray()
  includeStatuses?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
