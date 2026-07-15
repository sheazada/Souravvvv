import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { QueryCollectionsTrendDto, QueryPaymentAnalyticsDto } from './dto';
import { PaymentAnalyticsService } from './payment-analytics.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PaymentAnalyticsController {
  constructor(private readonly paymentAnalyticsService: PaymentAnalyticsService) {}

  @Get('payments/analytics/summary')
  getSummary(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryPaymentAnalyticsDto) {
    return this.paymentAnalyticsService.getSummary(currentUser, query);
  }

  @Get('payments/analytics/collections-trend')
  getCollectionsTrend(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryCollectionsTrendDto,
  ) {
    return this.paymentAnalyticsService.getCollectionsTrend(currentUser, query);
  }

  @Get('payments/analytics/method-distribution')
  getMethodDistribution(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryPaymentAnalyticsDto,
  ) {
    return this.paymentAnalyticsService.getMethodDistribution(currentUser, query);
  }

  @Get('payments/analytics/high-risk-retailers')
  getHighRiskRetailers(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryPaymentAnalyticsDto,
  ) {
    return this.paymentAnalyticsService.getHighRiskRetailers(currentUser, query);
  }

  @Get('payments/analytics/overdue-buckets')
  getOverdueBuckets(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryPaymentAnalyticsDto,
  ) {
    return this.paymentAnalyticsService.getOverdueBuckets(currentUser, query);
  }

  @Get('payments/analytics/follow-up-queue')
  getFollowUpQueue(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryPaymentAnalyticsDto,
  ) {
    return this.paymentAnalyticsService.getFollowUpQueue(currentUser, query);
  }
}
