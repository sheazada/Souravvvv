import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class SyncEventItemDto {
  @IsString()
  @MaxLength(100)
  deviceId!: string;

  @IsString()
  @MaxLength(50)
  entityType!: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsIn(['create', 'update', 'delete', 'collection', 'stop_status'])
  action!: string;

  payloadJson!: Record<string, any>;

  @IsDateString()
  clientTimestamp!: string;
}

export class PushSyncEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncEventItemDto)
  events!: SyncEventItemDto[];
}

export class ResolveConflictDto {
  @IsIn(['server_wins', 'client_wins', 'manual_merge'])
  resolutionStrategy!: string;

  @IsOptional()
  mergedPayload?: Record<string, any>;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

export class QuerySyncEventsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  syncStatus?: string;
}
