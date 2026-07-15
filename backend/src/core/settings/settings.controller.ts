import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UpdateRetailerNoteThresholdsDto } from './dto';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('settings/retailer-note-thresholds')
  getRetailerNoteThresholds(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.settingsService.getRetailerNoteThresholds(currentUser);
  }

  @Get('settings/retailer-note-thresholds/cache-debug')
  getRetailerNoteThresholdCacheDebug(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.settingsService.getRetailerNoteThresholdCacheDebug(currentUser);
  }

  @Patch('settings/retailer-note-thresholds')
  updateRetailerNoteThresholds(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateRetailerNoteThresholdsDto,
  ) {
    return this.settingsService.updateRetailerNoteThresholds(currentUser, dto);
  }

  @Post('settings/retailer-note-thresholds/cache-reset')
  resetRetailerNoteThresholdCache(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.settingsService.resetRetailerNoteThresholdCache(currentUser);
  }

  @Delete('settings/retailer-note-thresholds')
  resetRetailerNoteThresholds(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.settingsService.resetRetailerNoteThresholds(currentUser);
  }
}
