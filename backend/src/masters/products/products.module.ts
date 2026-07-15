import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductsController } from './products.controller';
import { ProductVariantsController } from './product-variants.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, ProductVariantsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
