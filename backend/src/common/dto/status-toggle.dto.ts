import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class StatusToggleDto {
  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
