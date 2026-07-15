import { IsOptional, IsString } from 'class-validator';

export class UpdateDemandConsolidationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
