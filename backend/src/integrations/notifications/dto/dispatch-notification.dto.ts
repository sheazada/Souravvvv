import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class DispatchNotificationDto {
  @IsNotEmpty()
  @IsString()
  eventKey!: string;

  @IsOptional()
  @IsIn(['whatsapp', 'sms', 'email', 'in_app'])
  channel?: string;

  @IsNotEmpty()
  @IsString()
  recipientMobile!: string;

  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
