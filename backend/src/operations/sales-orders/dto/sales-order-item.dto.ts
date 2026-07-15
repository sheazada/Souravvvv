import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SalesOrderItemDto {
  @IsUUID()
  variantId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  qty!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
