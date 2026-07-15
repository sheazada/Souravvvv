import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CreateCrateTransactionDto,
  QueryCrateBalancesDto,
  QueryCrateTransactionsDto,
} from './dto';
import { CratesService } from './crates.service';

@UseGuards(JwtAuthGuard)
@Controller('crates')
export class CratesController {
  constructor(private readonly cratesService: CratesService) {}

  @Get('transactions')
  findTransactions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryCrateTransactionsDto,
  ) {
    return this.cratesService.findTransactions(currentUser, query);
  }

  @Get('balances')
  findBalances(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryCrateBalancesDto,
  ) {
    return this.cratesService.findBalances(currentUser, query);
  }

  @Post('transactions')
  createTransaction(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateCrateTransactionDto,
  ) {
    return this.cratesService.createTransaction(currentUser, dto);
  }

  @Post('balances/recalculate')
  recalculateBalances(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body('retailerId') retailerId?: string,
    @Body('targetDate') targetDate?: string,
  ) {
    return this.cratesService.recalculateBalances(currentUser, retailerId, targetDate);
  }

  @Get('export')
  export(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryCrateTransactionsDto,
    @Query('format') format = 'pdf',
  ) {
    return this.cratesService.export(currentUser, format, query);
  }
}
