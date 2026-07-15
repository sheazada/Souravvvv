import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ManualReceiptAllocationItemDto } from './manual-receipt-allocation-item.dto';

export class ReallocatePaymentReceiptDto {
  @IsDateString()
  allocationDate!: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  clearExistingAllocations!: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ManualReceiptAllocationItemDto)
  allocations!: ManualReceiptAllocationItemDto[];

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  treatRemainingAsAdvance?: boolean;

  @IsOptional()
  @IsString()
  remarks?: string;
}
