import { IsString, Length } from 'class-validator';

export class ResetUserPasswordDto {
  @IsString()
  @Length(6, 100)
  newPassword!: string;
}
