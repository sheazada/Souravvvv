import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { CreatePurchaseOrderFromDemandItemDto } from './create-purchase-order-from-demand-item.dto';

export class CreatePurchaseOrderFromDemandDto {
  @IsUUID()
  demandConsolidationId!: string;

  @IsUUID()
  supplierId!: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderFromDemandItemDto)
  items?: CreatePurchaseOrderFromDemandItemDto[];
}
