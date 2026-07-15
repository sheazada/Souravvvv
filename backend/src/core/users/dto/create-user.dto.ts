import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @Length(2, 150)
  fullName!: string;

  @IsString()
  @Length(10, 20)
  mobile!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @Length(6, 100)
  password!: string;

  @IsIn(['admin', 'employee', 'backoffice', 'driver', 'sales'])
  userType!: string;

  @IsArray()
  @IsString({ each: true })
  roleCodes!: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
