import { IsMobilePhone, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsMobilePhone('en-IN')
  mobile!: string;

  @IsString()
  @Length(4, 8)
  otp!: string;
}
