import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AccountingService } from './accounting.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('finance/gst-summary')
  getGstSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getGstSummary(currentUser, { fromDate, toDate });
  }

  @Get('accounts')
  getAccounts(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('accountType') accountType?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.accountingService.getAccounts(currentUser, { accountType, isActive });
  }

  @Get('journal-entries')
  getJournalEntries(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('voucherType') voucherType?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getJournalEntries(currentUser, {
      page,
      limit,
      voucherType,
      status,
      fromDate,
      toDate,
    });
  }

  @Get('journal-entries/:id')
  getJournalEntry(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.accountingService.getJournalEntry(currentUser, id);
  }

  @Get('ledger/customers')
  getCustomerLedger(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('retailerId') retailerId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getCustomerLedger(currentUser, {
      retailerId,
      fromDate,
      toDate,
    });
  }

  @Get('ledger/suppliers')
  getSupplierLedger(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('supplierId') supplierId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getSupplierLedger(currentUser, {
      supplierId,
      fromDate,
      toDate,
    });
  }

  @Get('ledger/account/:accountId')
  getAccountLedger(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getAccountLedger(currentUser, accountId, {
      fromDate,
      toDate,
    });
  }

  @Get('finance/trial-balance')
  getTrialBalance(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.accountingService.getTrialBalance(currentUser, { asOfDate });
  }

  @Get('finance/profit-loss')
  getProfitLoss(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountingService.getProfitLoss(currentUser, { fromDate, toDate });
  }

  @Get('finance/balance-sheet')
  getBalanceSheet(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.accountingService.getBalanceSheet(currentUser, { asOfDate });
  }
}
