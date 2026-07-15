import { IsBoolean, IsIn } from 'class-validator';

export class UpdateOrderingModeDto {
  @IsIn(['self_service', 'assisted', 'hybrid'])
  orderingMode!: string;

  @IsBoolean()
  isOrderingEnabled!: boolean;

  @IsBoolean()
  isBillingEnabled!: boolean;
}
