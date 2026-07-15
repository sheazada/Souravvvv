import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class UpdateRetailerCreditSettingsDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  creditLimit!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  creditDays!: number;
}
