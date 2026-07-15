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
  CancelAndRegenerateSalesInvoiceDto,
  CreateAssistedSalesInvoiceDto,
  DeleteDraftSalesInvoiceDto,
  GenerateSalesInvoiceDto,
  PreviewSalesInvoiceRevisionDto,
  QuerySalesInvoicesDto,
  RecomputeSalesInvoiceFromDeliveryDto,
  ReviseSalesInvoiceDto,
  UpdateDraftSalesInvoiceDto,
} from './dto';
import { SalesInvoicesService } from './sales-invoices.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class SalesInvoicesController {
  constructor(private readonly salesInvoicesService: SalesInvoicesService) {}

  @Get('sales-invoices')
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QuerySalesInvoicesDto,
  ) {
    return this.salesInvoicesService.findAll(currentUser, query);
  }

  @Post('sales-invoices/generate')
  generate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: GenerateSalesInvoiceDto,
  ) {
    return this.salesInvoicesService.generate(currentUser, dto);
  }

  @Post('sales-invoices/assisted')
  createAssisted(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateAssistedSalesInvoiceDto,
  ) {
    return this.salesInvoicesService.createAssisted(currentUser, dto);
  }

  @Get('sales-invoices/:id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesInvoicesService.findOne(currentUser, id);
  }

  @Patch('sales-invoices/:id')
  updateDraft(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDraftSalesInvoiceDto,
  ) {
    return this.salesInvoicesService.updateDraft(currentUser, id, dto);
  }

  @Post('sales-invoices/:id/delete-draft')
  deleteDraft(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DeleteDraftSalesInvoiceDto,
  ) {
    return this.salesInvoicesService.deleteDraft(currentUser, id, dto);
  }

  @Post('sales-invoices/:id/revision-preview')
  previewRevision(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewSalesInvoiceRevisionDto,
  ) {
    return this.salesInvoicesService.previewRevision(currentUser, id, dto);
  }

  @Post('sales-invoices/:id/revise')
  revise(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviseSalesInvoiceDto,
  ) {
    return this.salesInvoicesService.revisePostedUnpaid(currentUser, id, dto);
  }

  @Post('sales-invoices/:id/cancel-and-regenerate')
  cancelAndRegenerate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAndRegenerateSalesInvoiceDto,
  ) {
    return this.salesInvoicesService.cancelAndRegenerate(currentUser, id, dto);
  }

  @Post('sales-invoices/:id/recompute-from-delivery')
  recomputeFromDelivery(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecomputeSalesInvoiceFromDeliveryDto,
  ) {
    return this.salesInvoicesService.recomputeFromDelivery(currentUser, id, dto);
  }

  @Get('sales-invoices/:id/revision-history')
  getRevisionHistory(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesInvoicesService.getRevisionHistory(currentUser, id);
  }

  @Post('sales-invoices/:id/post')
  post(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesInvoicesService.post(currentUser, id);
  }

  @Post('sales-invoices/:id/cancel')
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesInvoicesService.cancel(currentUser, id);
  }

  @Get('sales-invoices/:id/export')
  export(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format = 'pdf',
  ) {
    return this.salesInvoicesService.export(currentUser, id, format);
  }

  @Post('sales-invoices/:id/share/whatsapp')
  shareWhatsApp(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesInvoicesService.shareWhatsApp(currentUser, id);
  }

  @Get('my/invoices')
  getMyInvoices(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QuerySalesInvoicesDto,
  ) {
    return this.salesInvoicesService.getMyInvoices(currentUser, query);
  }

  @Get('my/invoices/:id')
  getMyInvoiceById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesInvoicesService.getMyInvoiceById(currentUser, id);
  }

  @Get('my/dues')
  getMyDues(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.salesInvoicesService.getMyDues(currentUser);
  }
}
