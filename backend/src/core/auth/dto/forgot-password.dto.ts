import { IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  login!: string;
}
