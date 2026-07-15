import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CancelPaymentReminderDto,
  GeneratePaymentRemindersDto,
  QueryPaymentRemindersDto,
  RunPaymentRemindersDto,
  SendPaymentReminderDto,
} from './dto';
import { PaymentRemindersService } from './payment-reminders.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentRemindersController {
  constructor(private readonly paymentRemindersService: PaymentRemindersService) {}

  @Get('payment-reminders')
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryPaymentRemindersDto) {
    return this.paymentRemindersService.findAll(currentUser, query);
  }

  @Get('retailers/:id/payment-reminders')
  findByRetailer(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryPaymentRemindersDto,
  ) {
    return this.paymentRemindersService.findByRetailer(currentUser, retailerId, query);
  }

  @Post('payment-reminders/generate')
  generate(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: GeneratePaymentRemindersDto) {
    return this.paymentRemindersService.generate(currentUser, dto);
  }

  @Post('payment-reminders/run-due')
  runDue(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: RunPaymentRemindersDto) {
    return this.paymentRemindersService.runDue(currentUser, dto);
  }

  @Post('payment-reminders/:id/send')
  sendOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendPaymentReminderDto,
  ) {
    return this.paymentRemindersService.sendOne(currentUser, id, dto);
  }

  @Post('payment-reminders/:id/cancel')
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPaymentReminderDto,
  ) {
    return this.paymentRemindersService.cancel(currentUser, id, dto);
  }
}
