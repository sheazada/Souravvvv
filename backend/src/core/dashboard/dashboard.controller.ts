import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { DashboardQueryDto } from './dto';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getSummary(currentUser, query);
  }

  @Get('charts/monthly-sales')
  getMonthlySalesChart(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getMonthlySalesChart(currentUser, query);
  }

  @Get('charts/top-products')
  getTopProducts(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getTopProducts(currentUser, query);
  }

  @Get('charts/top-retailers')
  getTopRetailers(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getTopRetailers(currentUser, query);
  }

  @Get('charts/delivery-performance')
  getDeliveryPerformance(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getDeliveryPerformance(currentUser, query);
  }

  @Get('charts/staff-performance')
  getStaffPerformance(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getStaffPerformance(currentUser, query);
  }

  @Get('owner')
  getOwnerDashboard(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getOwnerDashboard(currentUser, query);
  }

  @Get('operations')
  getOperationsDashboard(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getOperationsDashboard(currentUser, query);
  }

  @Get('finance')
  getFinanceDashboard(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getFinanceDashboard(currentUser, query);
  }

  @Get('dispatch')
  getDispatchDashboard(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getDispatchDashboard(currentUser, query);
  }

  @Get('retailer')
  getRetailerDashboard(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.dashboardService.getRetailerDashboard(currentUser);
  }

  @Get('driver')
  getDriverDashboard(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.dashboardService.getDriverDashboard(currentUser);
  }
}
