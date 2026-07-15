import { IsBoolean, IsEmail, IsIn, IsMobilePhone, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRetailerDto {
  @IsString()
  @MaxLength(30)
  retailerCode!: string;

  @IsString()
  @MaxLength(150)
  shopName!: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsMobilePhone('en-IN')
  mobile!: string;

  @IsOptional()
  @IsMobilePhone('en-IN')
  alternateMobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  locality?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 7 })
  longitude?: number;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsString()
  aadhaarNo?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  creditLimit!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  creditDays!: number;

  @IsOptional()
  @IsUUID()
  assignedRouteId?: string;

  @IsOptional()
  @IsUUID()
  assignedSalespersonId?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  preferredDeliveryStart?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  preferredDeliveryEnd?: string;

  @IsOptional()
  @IsString()
  retailerCategory?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'blocked', 'seasonal', 'under_review'])
  businessStatus?: string;

  @IsOptional()
  @IsString()
  shopPhotoUrl?: string;

  @IsOptional()
  @IsIn(['self_service', 'assisted', 'hybrid'])
  orderingMode?: string;

  @IsOptional()
  @IsBoolean()
  isOrderingEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isBillingEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  openingBalance?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
