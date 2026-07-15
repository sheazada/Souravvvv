import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CreatePurchaseOrderDto,
  CreatePurchaseOrderFromDemandDto,
  QueryPurchaseOrdersDto,
  UpdatePurchaseOrderDemandExtrasDto,
  UpdatePurchaseOrderDto,
} from './dto';
import { PurchaseOrdersService } from './purchase-orders.service';

@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryPurchaseOrdersDto,
  ) {
    return this.purchaseOrdersService.findAll(currentUser, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.create(currentUser, dto);
  }

  @Post('from-demand-consolidation')
  createFromDemand(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreatePurchaseOrderFromDemandDto,
  ) {
    return this.purchaseOrdersService.createFromDemand(currentUser, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseOrdersService.findOne(currentUser, id);
  }

  @Get(':id/items')
  getItems(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseOrdersService.getItems(currentUser, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(currentUser, id, dto);
  }

  @Patch(':id/demand-extras')
  updateDemandExtras(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDemandExtrasDto,
  ) {
    return this.purchaseOrdersService.updateDemandExtras(currentUser, id, dto);
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseOrdersService.approve(currentUser, id);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.purchaseOrdersService.cancel(currentUser, id);
  }
}
