import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DeliveryCyclesController } from './delivery-cycles.controller';
import { DeliveryCyclesService } from './delivery-cycles.service';

@Module({
  imports: [PrismaModule],
  controllers: [DeliveryCyclesController],
  providers: [DeliveryCyclesService],
  exports: [DeliveryCyclesService],
})
export class DeliveryCyclesModule {}
