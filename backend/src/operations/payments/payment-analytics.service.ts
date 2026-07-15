import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryCollectionsTrendDto, QueryPaymentAnalyticsDto } from './dto';

@Injectable()
export class PaymentAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(actor: AuthenticatedUser, query: QueryPaymentAnalyticsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('Payment analytics summary skeleton ready', { query });
  }

  async getCollectionsTrend(actor: AuthenticatedUser, query: QueryCollectionsTrendDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('Payment collections trend skeleton ready', { query, points: [] });
  }

  async getMethodDistribution(actor: AuthenticatedUser, query: QueryPaymentAnalyticsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('Payment method distribution skeleton ready', { query, items: [] });
  }

  async getHighRiskRetailers(actor: AuthenticatedUser, query: QueryPaymentAnalyticsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('High-risk retailers analytics skeleton ready', { query, items: [] });
  }

  async getOverdueBuckets(actor: AuthenticatedUser, query: QueryPaymentAnalyticsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('Overdue bucket analytics skeleton ready', { query, items: [] });
  }

  async getFollowUpQueue(actor: AuthenticatedUser, query: QueryPaymentAnalyticsDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('Payment follow-up queue skeleton ready', { query, items: [] });
  }

  private skeleton(message: string, data: Record<string, unknown>) {
    return {
      success: true,
      message,
      data,
    };
  }

  private assertAuthenticated(actor?: AuthenticatedUser): asserts actor is AuthenticatedUser {
    if (!actor?.id || !actor.organizationId) {
      throw new UnauthorizedException('Authentication required');
    }
  }

  private assertBackoffice(actor: AuthenticatedUser) {
    if (actor.roles.includes('RETAILER') || actor.userType === 'retailer_user') {
      throw new ForbiddenException('Backoffice access required');
    }
  }
}
