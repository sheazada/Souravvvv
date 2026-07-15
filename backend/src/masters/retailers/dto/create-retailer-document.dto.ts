import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateRetailerDocumentDto {
  @IsIn(['gst', 'pan', 'aadhaar', 'shop_photo', 'other'])
  documentType!: string;

  @IsString()
  fileName!: string;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
