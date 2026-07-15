import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class ManualReceiptAllocationItemDto {
  @IsUUID()
  salesInvoiceId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  allocatedAmount!: number;

  @IsOptional()
  @IsDateString()
  allocationDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
