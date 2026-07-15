import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  UpdateProductVariantDto,
  UpdateProductVariantStatusDto,
} from './dto';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard)
@Controller('product-variants')
export class ProductVariantsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.productsService.getVariantById(currentUser, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productsService.updateVariant(currentUser, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductVariantStatusDto,
  ) {
    return this.productsService.updateVariantStatus(currentUser, id, dto);
  }
}
