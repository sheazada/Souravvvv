import { forwardRef, Module } from '@nestjs/common';
import { AccountingModule } from '../../finance/accounting/accounting.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { SalesInvoicesModule } from '../sales-invoices/sales-invoices.module';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [PrismaModule, AccountingModule, PaymentsModule, forwardRef(() => SalesInvoicesModule)],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
