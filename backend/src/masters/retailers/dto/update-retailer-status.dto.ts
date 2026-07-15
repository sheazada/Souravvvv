import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateRetailerStatusDto {
  @IsIn(['active', 'inactive', 'blocked', 'seasonal', 'under_review'])
  businessStatus!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
