import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CheckRetailerCreditDto,
  CreateRetailerCreditOverrideDto,
  QueryRetailerCreditHistoryDto,
  QueryRetailerCreditOverridesDto,
  UpsertRetailerCreditProfileDto,
} from './dto';
import { CreditControlService } from './credit-control.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class CreditControlController {
  constructor(private readonly creditControlService: CreditControlService) {}

  @Get('retailers/:id/credit-profile')
  getCreditProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
  ) {
    return this.creditControlService.getCreditProfile(currentUser, retailerId);
  }

  @Patch('retailers/:id/credit-profile')
  upsertCreditProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Body() dto: UpsertRetailerCreditProfileDto,
  ) {
    return this.creditControlService.upsertCreditProfile(currentUser, retailerId, dto);
  }

  @Post('retailers/:id/credit-check')
  checkCredit(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Body() dto: CheckRetailerCreditDto,
  ) {
    return this.creditControlService.checkCredit(currentUser, retailerId, dto);
  }

  @Get('retailers/:id/credit-overrides')
  getCreditOverrides(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryRetailerCreditOverridesDto,
  ) {
    return this.creditControlService.getCreditOverrides(currentUser, retailerId, query);
  }

  @Post('retailers/:id/credit-overrides')
  createCreditOverride(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Body() dto: CreateRetailerCreditOverrideDto,
  ) {
    return this.creditControlService.createCreditOverride(currentUser, retailerId, dto);
  }

  @Get('retailers/:id/credit-history')
  getCreditHistory(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryRetailerCreditHistoryDto,
  ) {
    return this.creditControlService.getCreditHistory(currentUser, retailerId, query);
  }
}
