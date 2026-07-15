import { IsArray, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class GeneratePaymentRemindersDto {
  @IsDateString()
  asOfDate!: string;

  @IsOptional()
  @IsUUID()
  retailerId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stages?: string[];
}
