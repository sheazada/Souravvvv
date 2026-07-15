import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class RecomputeSalesInvoiceFromDeliveryDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  applyImmediately?: boolean;
}
