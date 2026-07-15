import {
  Body,
  Controller,
  Delete,
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
  CreateRetailerDocumentDto,
  CreateRetailerDto,
  QueryRetailersDto,
  UpdateOrderingModeDto,
  UpdateRetailerCreditSettingsDto,
  UpdateRetailerDto,
  UpdateRetailerRouteAssignmentDto,
  UpdateRetailerStatusDto,
} from './dto';
import { RetailersService } from './retailers.service';

@UseGuards(JwtAuthGuard)
@Controller('retailers')
export class RetailersController {
  constructor(private readonly retailersService: RetailersService) {}

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateRetailerDto,
  ) {
    return this.retailersService.create(currentUser, dto);
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryRetailersDto,
  ) {
    return this.retailersService.findAll(currentUser, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.findOne(currentUser, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRetailerDto,
  ) {
    return this.retailersService.update(currentUser, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRetailerStatusDto,
  ) {
    return this.retailersService.updateStatus(currentUser, id, dto);
  }

  @Patch(':id/ordering-mode')
  updateOrderingMode(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderingModeDto,
  ) {
    return this.retailersService.updateOrderingMode(currentUser, id, dto);
  }

  @Patch(':id/credit-settings')
  updateCreditSettings(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRetailerCreditSettingsDto,
  ) {
    return this.retailersService.updateCreditSettings(currentUser, id, dto);
  }

  @Patch(':id/route-assignment')
  updateRouteAssignment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRetailerRouteAssignmentDto,
  ) {
    return this.retailersService.updateRouteAssignment(currentUser, id, dto);
  }

  @Get(':id/documents')
  listDocuments(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.listDocuments(currentUser, id);
  }

  @Post(':id/documents')
  createDocument(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRetailerDocumentDto,
  ) {
    return this.retailersService.createDocument(currentUser, id, dto);
  }

  @Delete(':id/documents/:documentId')
  deleteDocument(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.retailersService.deleteDocument(currentUser, id, documentId);
  }

  @Get(':id/ledger-summary')
  getLedgerSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.getLedgerSummary(currentUser, id);
  }

  @Get(':id/ledger-transactions')
  getLedgerTransactions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.getLedgerTransactions(currentUser, id);
  }

  @Get(':id/outstanding')
  getOutstanding(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.getOutstanding(currentUser, id);
  }

  @Get(':id/statements')
  getStatements(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.getStatements(currentUser, id);
  }

  @Get(':id/orders')
  getOrders(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.getOrders(currentUser, id);
  }

  @Get(':id/invoices')
  getInvoices(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.getInvoices(currentUser, id);
  }

  @Get(':id/payments')
  getPayments(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.getPayments(currentUser, id);
  }

  @Get(':id/returns')
  getReturns(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.getReturns(currentUser, id);
  }

  @Get(':id/crates')
  getCrates(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailersService.getCrates(currentUser, id);
  }
}
