import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { NotificationsService } from '../../integrations/notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CancelPaymentReminderDto,
  GeneratePaymentRemindersDto,
  QueryPaymentRemindersDto,
  RunPaymentRemindersDto,
  SendPaymentReminderDto,
} from './dto';

@Injectable()
export class PaymentRemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(actor: AuthenticatedUser, query: QueryPaymentRemindersDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('Payment reminder list skeleton ready', {
      query,
      items: [],
    });
  }

  async findByRetailer(actor: AuthenticatedUser, retailerId: string, query: QueryPaymentRemindersDto) {
    this.assertAuthenticated(actor);
    return this.skeleton('Retailer payment reminder history skeleton ready', {
      retailerId,
      query,
      items: [],
    });
  }

  async generate(actor: AuthenticatedUser, dto: GeneratePaymentRemindersDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('Payment reminder generation skeleton ready', { dto });
  }

  async runDue(actor: AuthenticatedUser, dto: RunPaymentRemindersDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('Payment reminder run-due skeleton ready', { dto });
  }

  async sendOne(actor: AuthenticatedUser, id: string, dto: SendPaymentReminderDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('Single payment reminder send skeleton ready', { id, dto });
  }

  async cancel(actor: AuthenticatedUser, id: string, dto: CancelPaymentReminderDto) {
    this.assertAuthenticated(actor);
    this.assertBackoffice(actor);
    return this.skeleton('Payment reminder cancellation skeleton ready', { id, dto });
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
