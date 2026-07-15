import { Type } from 'class-transformer';
import { IsNumber, IsUUID } from 'class-validator';

export class CollectionAllocationItemDto {
  @IsUUID()
  invoiceId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  allocatedAmount!: number;
}
