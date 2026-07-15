import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class CreateDeliveryCycleDto {
  @IsDateString()
  orderDate!: string;

  @IsDateString()
  deliveryDate!: string;

  @IsIn(['morning', 'evening'])
  deliveryShift!: string;

  @IsDateString()
  cutoffAt!: string;

  @IsOptional()
  @IsIn(['open', 'closed', 'planned', 'dispatched', 'completed'])
  status?: string;
}
