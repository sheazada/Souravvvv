import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  QueryRetailerLedgerDto,
  QueryRetailerOutstandingInvoicesDto,
  QueryRetailerStatementsDto,
} from './dto';
import { RetailerFinanceService } from './retailer-finance.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class RetailerFinanceController {
  constructor(private readonly retailerFinanceService: RetailerFinanceService) {}

  @Get('retailers/:id/financial-dashboard')
  getRetailerFinancialDashboard(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
  ) {
    return this.retailerFinanceService.getRetailerFinancialDashboard(currentUser, retailerId);
  }

  @Get('my/financial-dashboard')
  getMyFinancialDashboard(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.retailerFinanceService.getMyFinancialDashboard(currentUser);
  }

  @Get('retailers/:id/financial-summary')
  getRetailerFinancialSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
  ) {
    return this.retailerFinanceService.getRetailerFinancialSummary(currentUser, retailerId);
  }

  @Get('retailers/:id/ledger-entries')
  getRetailerLedgerEntries(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryRetailerLedgerDto,
  ) {
    return this.retailerFinanceService.getRetailerLedgerEntries(currentUser, retailerId, query);
  }

  @Get('retailers/:id/ledger-entries/:entryId')
  getRetailerLedgerEntryById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.retailerFinanceService.getRetailerLedgerEntryById(currentUser, retailerId, entryId);
  }

  @Get('my/ledger')
  getMyLedger(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryRetailerLedgerDto) {
    return this.retailerFinanceService.getMyLedger(currentUser, query);
  }

  @Get('retailers/:id/ledger/export')
  exportRetailerLedger(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryRetailerStatementsDto,
  ) {
    return this.retailerFinanceService.exportRetailerLedger(currentUser, retailerId, query);
  }

  @Get('my/ledger/export')
  exportMyLedger(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryRetailerStatementsDto) {
    return this.retailerFinanceService.exportMyLedger(currentUser, query);
  }

  @Get('retailers/:id/outstanding-invoices')
  getRetailerOutstandingInvoices(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryRetailerOutstandingInvoicesDto,
  ) {
    return this.retailerFinanceService.getRetailerOutstandingInvoices(currentUser, retailerId, query);
  }

  @Get('retailers/:id/outstanding-aging')
  getRetailerOutstandingAging(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
  ) {
    return this.retailerFinanceService.getRetailerOutstandingAging(currentUser, retailerId);
  }

  @Get('my/outstanding-invoices')
  getMyOutstandingInvoices(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryRetailerOutstandingInvoicesDto,
  ) {
    return this.retailerFinanceService.getMyOutstandingInvoices(currentUser, query);
  }

  @Get('retailers/:id/statements/account')
  getRetailerAccountStatement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryRetailerStatementsDto,
  ) {
    return this.retailerFinanceService.getRetailerAccountStatement(currentUser, retailerId, query);
  }

  @Get('retailers/:id/statements/outstanding')
  getRetailerOutstandingStatement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryRetailerStatementsDto,
  ) {
    return this.retailerFinanceService.getRetailerOutstandingStatement(currentUser, retailerId, query);
  }

  @Get('retailers/:id/statements/payment-history')
  getRetailerPaymentHistoryStatement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryRetailerStatementsDto,
  ) {
    return this.retailerFinanceService.getRetailerPaymentHistoryStatement(currentUser, retailerId, query);
  }

  @Get('retailers/:id/statements/passbook')
  getRetailerPassbookStatement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryRetailerStatementsDto,
  ) {
    return this.retailerFinanceService.getRetailerPassbookStatement(currentUser, retailerId, query);
  }

  @Get('my/statements/account')
  getMyAccountStatement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryRetailerStatementsDto,
  ) {
    return this.retailerFinanceService.getMyAccountStatement(currentUser, query);
  }

  @Get('my/statements/outstanding')
  getMyOutstandingStatement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryRetailerStatementsDto,
  ) {
    return this.retailerFinanceService.getMyOutstandingStatement(currentUser, query);
  }

  @Get('my/statements/passbook')
  getMyPassbookStatement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryRetailerStatementsDto,
  ) {
    return this.retailerFinanceService.getMyPassbookStatement(currentUser, query);
  }
}
