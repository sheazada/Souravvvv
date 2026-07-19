import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PushSyncEventsDto, QuerySyncEventsDto, ResolveConflictDto } from './dto';
import { SyncService } from './sync.service';

@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('events')
  pushEvents(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: PushSyncEventsDto) {
    return this.syncService.pushEvents(currentUser, dto);
  }

  @Get('events')
  findAllEvents(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QuerySyncEventsDto) {
    return this.syncService.findAllEvents(currentUser, query);
  }

  @Get('conflicts')
  findConflicts(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QuerySyncEventsDto) {
    return this.syncService.findConflicts(currentUser, query);
  }

  @Post('conflicts/:id/resolve')
  resolveConflict(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveConflictDto,
  ) {
    return this.syncService.resolveConflict(currentUser, id, dto);
  }

  @Get('devices/:deviceId/status')
  getDeviceStatus(@CurrentUser() currentUser: AuthenticatedUser, @Param('deviceId') deviceId: string) {
    return this.syncService.getDeviceStatus(currentUser, deviceId);
  }
}
