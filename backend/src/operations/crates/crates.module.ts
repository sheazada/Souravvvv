import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CratesController } from './crates.controller';
import { CratesService } from './crates.service';

@Module({
  imports: [PrismaModule],
  controllers: [CratesController],
  providers: [CratesService],
  exports: [CratesService],
})
export class CratesModule {}
