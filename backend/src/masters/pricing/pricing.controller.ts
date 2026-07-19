import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreatePriceBookDto, CreatePromotionDto, PricingPreviewDto, QueryPricingDto } from './dto';
import { PricingService } from './pricing.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('price-books')
  createPriceBook(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreatePriceBookDto) {
    return this.pricingService.createPriceBook(currentUser, dto);
  }

  @Get('price-books')
  findAllPriceBooks(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryPricingDto) {
    return this.pricingService.findAllPriceBooks(currentUser, query);
  }

  @Get('price-books/:id')
  findOnePriceBook(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.pricingService.findOnePriceBook(currentUser, id);
  }

  @Post('promotions')
  createPromotion(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreatePromotionDto) {
    return this.pricingService.createPromotion(currentUser, dto);
  }

  @Get('promotions')
  findAllPromotions(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryPricingDto) {
    return this.pricingService.findAllPromotions(currentUser, query);
  }

  @Post('pricing/preview')
  previewPricing(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: PricingPreviewDto) {
    return this.pricingService.previewPricing(currentUser, dto);
  }
}
