import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CancelPaymentIntentDto, CreatePaymentIntentDto, QueryPaymentIntentsDto } from './dto';
import { PaymentIntentsService } from './payment-intents.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentIntentsController {
  constructor(private readonly paymentIntentsService: PaymentIntentsService) {}

  @Post('payment-intents')
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreatePaymentIntentDto) {
    return this.paymentIntentsService.create(currentUser, dto);
  }

  @Post('my/payment-intents')
  createMy(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreatePaymentIntentDto) {
    return this.paymentIntentsService.createMy(currentUser, dto);
  }

  @Get('payment-intents')
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryPaymentIntentsDto) {
    return this.paymentIntentsService.findAll(currentUser, query);
  }

  @Get('payment-intents/:id')
  findOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentIntentsService.findOne(currentUser, id);
  }

  @Get('my/payment-intents/:id')
  findMyOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentIntentsService.findMyOne(currentUser, id);
  }

  @Post('payment-intents/:id/cancel')
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPaymentIntentDto,
  ) {
    return this.paymentIntentsService.cancel(currentUser, id, dto);
  }

  @Post('payment-intents/:id/expire')
  expire(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentIntentsService.expire(currentUser, id);
  }

  @Get('payment-intents/:id/reconciliation-status')
  getReconciliationStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentIntentsService.getReconciliationStatus(currentUser, id);
  }
}
