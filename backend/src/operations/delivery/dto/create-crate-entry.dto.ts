import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateCrateEntryDto {
  @IsUUID()
  crateTypeId!: string;

  @IsIn(['issue', 'return', 'damage', 'missing', 'adjustment'])
  transactionType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
