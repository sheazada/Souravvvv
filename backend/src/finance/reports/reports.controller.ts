import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ReportFilterDto } from './dto';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-purchase')
  getDailyPurchase(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getDailyPurchaseReport(currentUser, filter);
  }

  @Get('daily-dispatch')
  getDailyDispatch(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getDailyDispatchReport(currentUser, filter);
  }

  @Get('product-wise-sales')
  getProductWiseSales(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getProductWiseSalesReport(currentUser, filter);
  }

  @Get('retailer-wise-sales')
  getRetailerWiseSales(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getRetailerWiseSalesReport(currentUser, filter);
  }

  @Get('route-wise-sales')
  getRouteWiseSales(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getRouteWiseSalesReport(currentUser, filter);
  }

  @Get('staff-performance')
  getStaffPerformance(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getStaffPerformanceReport(currentUser, filter);
  }

  @Get('collection')
  getCollection(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getCollectionReport(currentUser, filter);
  }

  @Get('outstanding')
  getOutstanding(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getOutstandingReport(currentUser, filter);
  }

  @Get('fast-moving-products')
  getFastMovingProducts(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getFastMovingProductsReport(currentUser, filter);
  }

  @Get('slow-moving-products')
  getSlowMovingProducts(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getSlowMovingProductsReport(currentUser, filter);
  }

  @Get('product-expiry')
  getProductExpiry(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getProductExpiryReport(currentUser, filter);
  }

  @Get('damage')
  getDamage(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getDamageReport(currentUser, filter);
  }

  @Get('return')
  getReturn(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getReturnReport(currentUser, filter);
  }

  @Get('crate')
  getCrate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getCrateReport(currentUser, filter);
  }

  @Get('profit')
  getProfit(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getProfitReport(currentUser, filter);
  }

  @Get('inventory-movement')
  getInventoryMovement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getInventoryMovementReport(currentUser, filter);
  }

  @Get('monthly-business-summary')
  getMonthlyBusinessSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() filter: ReportFilterDto,
  ) {
    return this.reportsService.getMonthlyBusinessSummary(currentUser, filter);
  }
}
