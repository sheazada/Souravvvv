import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class OrderActionDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
