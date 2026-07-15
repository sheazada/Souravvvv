import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  AutoAllocatePaymentReceiptDto,
  CreatePaymentAllocationDto,
  CreatePaymentReceiptDto,
  PreviewPaymentAllocationDto,
  QueryPaymentReceiptsDto,
  ReallocatePaymentReceiptDto,
} from './dto';
import { PaymentAllocationService } from './payment-allocation.service';
import { PaymentsService } from './payments.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentAllocationService: PaymentAllocationService,
  ) {}

  @Post('payment-allocation/preview')
  previewAllocation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: PreviewPaymentAllocationDto,
  ) {
    return this.paymentAllocationService.preview(currentUser, dto);
  }

  @Get('payment-receipts')
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryPaymentReceiptsDto,
  ) {
    return this.paymentsService.findAll(currentUser, query);
  }

  @Post('payment-receipts')
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreatePaymentReceiptDto,
  ) {
    return this.paymentsService.create(currentUser, dto);
  }

  @Get('payment-receipts/:id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.findOne(currentUser, id);
  }

  @Get('payment-receipts/:id/receipt-document')
  getReceiptDocument(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.getReceiptDocument(currentUser, id);
  }

  @Post('payment-receipts/:id/confirm')
  confirm(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.confirm(currentUser, id);
  }

  @Post('payment-receipts/:id/cancel')
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.cancel(currentUser, id);
  }

  @Get('payment-receipts/:id/allocations')
  getAllocations(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.getAllocations(currentUser, id);
  }

  @Post('payment-receipts/:id/allocations/auto-fifo')
  autoAllocateFifo(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AutoAllocatePaymentReceiptDto,
  ) {
    return this.paymentsService.autoAllocateFifo(currentUser, id, dto);
  }

  @Post('payment-receipts/:id/allocations')
  createAllocation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePaymentAllocationDto,
  ) {
    return this.paymentsService.createAllocation(currentUser, id, dto);
  }

  @Post('payment-receipts/:id/reallocate')
  reallocate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReallocatePaymentReceiptDto,
  ) {
    return this.paymentsService.reallocate(currentUser, id, dto);
  }

  @Get('retailers/:id/payment-receipts')
  getRetailerReceipts(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryPaymentReceiptsDto,
  ) {
    return this.paymentsService.getRetailerReceipts(currentUser, retailerId, query);
  }

  @Get('my/payment-receipts')
  getMyReceipts(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryPaymentReceiptsDto,
  ) {
    return this.paymentsService.getMyReceipts(currentUser, query);
  }

  @Get('my/payment-receipts/:id')
  getMyReceiptById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.getMyReceiptById(currentUser, id);
  }

  @Get('outstanding/retailers')
  getRetailerOutstanding(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.paymentsService.getRetailerOutstanding(currentUser);
  }

  @Get('outstanding/suppliers')
  getSupplierOutstanding(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.paymentsService.getSupplierOutstanding(currentUser);
  }

  @Get('outstanding/aging')
  getOutstandingAging(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.paymentsService.getOutstandingAging(currentUser);
  }
}
