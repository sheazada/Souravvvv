import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateSalesReturnItemDto {
  @IsUUID()
  variantId!: string;

  @IsOptional()
  @IsUUID()
  inventoryBatchId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  returnQty!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsIn(['restock', 'damage_writeoff', 'claim'])
  disposition?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditAmount?: number;
}

export class CreateSalesReturnDto {
  @IsUUID()
  retailerId!: string;

  @IsOptional()
  @IsUUID()
  salesInvoiceId?: string;

  @IsOptional()
  @IsUUID()
  dispatchTripId?: string;

  @IsIn(['leakage', 'spoilage', 'damaged', 'expired', 'excess'])
  returnType!: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnItemDto)
  items!: CreateSalesReturnItemDto[];
}

export class QuerySalesReturnsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  returnType?: string;
}

export class CreateClaimDto {
  @IsIn(['retailer', 'supplier'])
  partyType!: string;

  @IsOptional()
  @IsUUID()
  partyId?: string;

  @IsOptional()
  @IsUUID()
  relatedReturnId?: string;

  @IsString()
  claimType!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  claimAmount!: number;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

export class QueryClaimsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  partyType?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
