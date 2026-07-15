import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../../operations/payments/payments.module';
import { RetailersController } from './retailers.controller';
import { RetailersService } from './retailers.service';

@Module({
  imports: [PrismaModule, PaymentsModule],
  controllers: [RetailersController],
  providers: [RetailersService],
  exports: [RetailersService],
})
export class RetailersModule {}
