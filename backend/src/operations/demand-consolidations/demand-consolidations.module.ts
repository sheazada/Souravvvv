import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DemandConsolidationsController } from './demand-consolidations.controller';
import { DemandConsolidationsService } from './demand-consolidations.service';

@Module({
  imports: [PrismaModule],
  controllers: [DemandConsolidationsController],
  providers: [DemandConsolidationsService],
  exports: [DemandConsolidationsService],
})
export class DemandConsolidationsModule {}
