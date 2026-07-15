import { IsMobilePhone, IsOptional, IsString } from 'class-validator';

export class SendOtpDto {
  @IsMobilePhone('en-IN')
  mobile!: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
