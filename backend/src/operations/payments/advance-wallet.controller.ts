import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AdjustAdvanceWalletDto, ApplyWalletBalanceDto, QueryWalletTransactionsDto } from './dto';
import { AdvanceWalletService } from './advance-wallet.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class AdvanceWalletController {
  constructor(private readonly advanceWalletService: AdvanceWalletService) {}

  @Get('retailers/:id/advance-wallet')
  getWallet(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) retailerId: string) {
    return this.advanceWalletService.getWallet(currentUser, retailerId);
  }

  @Get('my/advance-wallet')
  getMyWallet(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.advanceWalletService.getMyWallet(currentUser);
  }

  @Get('retailers/:id/wallet-transactions')
  getWalletTransactions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryWalletTransactionsDto,
  ) {
    return this.advanceWalletService.getWalletTransactions(currentUser, retailerId, query);
  }

  @Post('retailers/:id/advance-wallet/adjustments')
  adjustWallet(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Body() dto: AdjustAdvanceWalletDto,
  ) {
    return this.advanceWalletService.adjustWallet(currentUser, retailerId, dto);
  }

  @Post('retailers/:id/advance-wallet/apply')
  applyWalletBalance(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Body() dto: ApplyWalletBalanceDto,
  ) {
    return this.advanceWalletService.applyWalletBalance(currentUser, retailerId, dto);
  }
}
