import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class CreateFileAttachmentDto {
  @IsString()
  @MaxLength(200)
  fileName!: string;

  @IsString()
  @MaxLength(100)
  fileType!: string;

  @Type(() => Number)
  @IsNumber()
  sizeBytes!: number;

  @IsString()
  storagePath!: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}

export class QueryAttachmentsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}
