import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { QueryPaymentGatewayWebhooksDto, ReprocessPaymentGatewayWebhookDto } from './dto';
import { PaymentWebhooksService } from './payment-webhooks.service';

@Controller()
export class PaymentGatewaysController {
  constructor(private readonly paymentWebhooksService: PaymentWebhooksService) {}

  @Post('payment-gateways/:gateway/webhook')
  handleWebhook(
    @Param('gateway') gateway: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() request: Request,
    @Body() payload: Record<string, unknown>,
  ) {
    const rawBody = typeof request.body === 'string' ? request.body : undefined;
    return this.paymentWebhooksService.handleWebhook(gateway, headers, rawBody, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('payment-gateway-webhooks')
  findAllWebhooks(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryPaymentGatewayWebhooksDto,
  ) {
    return this.paymentWebhooksService.findAllWebhooks(currentUser, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('payment-gateway-webhooks/:id')
  findWebhookById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentWebhooksService.findWebhookById(currentUser, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('payment-gateway-webhooks/:id/reprocess')
  reprocessWebhook(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReprocessPaymentGatewayWebhookDto,
  ) {
    return this.paymentWebhooksService.reprocessWebhook(currentUser, id, dto);
  }
}
