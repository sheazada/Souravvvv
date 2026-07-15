import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DeliveryStopItemUpdateDto } from './delivery-stop-item-update.dto';

export class UpdateDeliveryStopStatusDto {
  @IsIn(['pending', 'delivered', 'partial', 'refused', 'failed'])
  status!: string;

  @IsOptional()
  @IsDateString()
  actualArrivalAt?: string;

  @IsOptional()
  @IsDateString()
  actualDepartureAt?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DeliveryStopItemUpdateDto)
  items?: DeliveryStopItemUpdateDto[];
}
