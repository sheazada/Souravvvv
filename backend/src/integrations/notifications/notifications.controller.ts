import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { NotificationsService } from './notifications.service';
import {
  DispatchNotificationDto,
  QueryNotificationLogsDto,
  QueryNotificationTemplatesDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('notification-logs/dispatch')
  dispatch(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: DispatchNotificationDto,
  ) {
    return this.notificationsService.triggerManualDispatch(currentUser, dto);
  }

  @Get('notification-logs')
  getLogs(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryNotificationLogsDto,
  ) {
    return this.notificationsService.getLogs(currentUser, query);
  }

  @Get('notification-logs/:id')
  getLogById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.getLogById(currentUser, id);
  }

  @Post('notification-logs/:id/retry')
  retryLog(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.retryLog(currentUser, id);
  }

  @Get('notification-templates')
  getTemplates(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryNotificationTemplatesDto,
  ) {
    return this.notificationsService.getTemplates(currentUser, query);
  }

  @Get('notification-templates/:id')
  getTemplateById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.getTemplateById(currentUser, id);
  }
}
