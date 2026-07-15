import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CreatePurchaseInvoiceDto,
  QueryPurchaseInvoicesDto,
  UpdatePurchaseInvoiceDto,
} from './dto';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@UseGuards(JwtAuthGuard)
@Controller('purchase-invoices')
export class PurchaseInvoicesController {
  constructor(private readonly purchaseInvoicesService: PurchaseInvoicesService) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryPurchaseInvoicesDto,
  ) {
    return this.purchaseInvoicesService.findAll(currentUser, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreatePurchaseInvoiceDto,
  ) {
    return this.purchaseInvoicesService.create(currentUser, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseInvoicesService.findOne(currentUser, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseInvoiceDto,
  ) {
    return this.purchaseInvoicesService.update(currentUser, id, dto);
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseInvoicesService.approve(currentUser, id);
  }

  @Post(':id/post')
  post(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseInvoicesService.post(currentUser, id);
  }

  @Get(':id/export')
  export(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format = 'pdf',
  ) {
    return this.purchaseInvoicesService.export(currentUser, id, format);
  }
}
