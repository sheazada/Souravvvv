import { Module } from '@nestjs/common';
import { AccountingModule } from '../../finance/accounting/accounting.module';
import { NotificationsModule } from '../../integrations/notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdvanceWalletController } from './advance-wallet.controller';
import { AdvanceWalletService } from './advance-wallet.service';
import { CreditControlController } from './credit-control.controller';
import { CreditControlService } from './credit-control.service';
import { PaymentAllocationService } from './payment-allocation.service';
import { PaymentAnalyticsController } from './payment-analytics.controller';
import { PaymentAnalyticsService } from './payment-analytics.service';
import { PaymentGatewaysController } from './payment-gateways.controller';
import { PaymentIntentsController } from './payment-intents.controller';
import { PaymentIntentsService } from './payment-intents.service';
import { PaymentMetricsService } from './payment-metrics.service';
import { PaymentRemindersController } from './payment-reminders.controller';
import { PaymentRemindersService } from './payment-reminders.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentWebhooksService } from './payment-webhooks.service';
import { RetailerCreditNotesController } from './retailer-credit-notes.controller';
import { RetailerCreditNotesService } from './retailer-credit-notes.service';
import { RetailerDebitNotesController } from './retailer-debit-notes.controller';
import { RetailerDebitNotesService } from './retailer-debit-notes.service';
import { RetailerFinanceController } from './retailer-finance.controller';
import { RetailerFinanceService } from './retailer-finance.service';
import { RetailerLedgerService } from './retailer-ledger.service';

@Module({
  imports: [PrismaModule, AccountingModule, NotificationsModule],
  controllers: [
    PaymentsController,
    PaymentIntentsController,
    RetailerFinanceController,
    CreditControlController,
    AdvanceWalletController,
    PaymentRemindersController,
    PaymentAnalyticsController,
    PaymentGatewaysController,
    RetailerCreditNotesController,
    RetailerDebitNotesController,
  ],
  providers: [
    PaymentsService,
    PaymentIntentsService,
    RetailerFinanceService,
    CreditControlService,
    PaymentAllocationService,
    RetailerLedgerService,
    AdvanceWalletService,
    PaymentRemindersService,
    PaymentAnalyticsService,
    PaymentWebhooksService,
    PaymentMetricsService,
    RetailerCreditNotesService,
    RetailerDebitNotesService,
  ],
  exports: [
    PaymentsService,
    PaymentIntentsService,
    RetailerFinanceService,
    CreditControlService,
    PaymentAllocationService,
    RetailerLedgerService,
    AdvanceWalletService,
    PaymentRemindersService,
    PaymentAnalyticsService,
    PaymentWebhooksService,
    PaymentMetricsService,
    RetailerCreditNotesService,
    RetailerDebitNotesService,
  ],
})
export class PaymentsModule {}
