import {
  Body,
  Controller,
  Delete,
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
  CreateAssistedSalesOrderDto,
  CreateSalesOrderDto,
  OrderActionDto,
  QuerySalesOrdersDto,
  UpdateSalesOrderDto,
} from './dto';
import { SalesOrdersService } from './sales-orders.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get('sales-orders')
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QuerySalesOrdersDto,
  ) {
    return this.salesOrdersService.findAll(currentUser, query);
  }

  @Post('sales-orders')
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateSalesOrderDto,
  ) {
    return this.salesOrdersService.create(currentUser, dto);
  }

  @Post('sales-orders/assisted')
  createAssisted(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateAssistedSalesOrderDto,
  ) {
    return this.salesOrdersService.createAssisted(currentUser, dto);
  }

  @Get('sales-orders/:id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesOrdersService.findOne(currentUser, id);
  }

  @Patch('sales-orders/:id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesOrderDto,
  ) {
    return this.salesOrdersService.update(currentUser, id, dto);
  }

  @Delete('sales-orders/:id')
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesOrdersService.remove(currentUser, id);
  }

  @Post('sales-orders/:id/approve')
  approve(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.salesOrdersService.approve(currentUser, id, dto);
  }

  @Post('sales-orders/:id/reject')
  reject(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.salesOrdersService.reject(currentUser, id, dto);
  }

  @Post('sales-orders/:id/cancel')
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.salesOrdersService.cancel(currentUser, id, dto);
  }

  @Post('sales-orders/:id/duplicate')
  duplicate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.salesOrdersService.duplicate(currentUser, id, dto);
  }

  @Post('sales-orders/:id/recalculate')
  recalculate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.salesOrdersService.recalculate(currentUser, id, dto);
  }

  @Get('my/orders')
  getMyOrders(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QuerySalesOrdersDto,
  ) {
    return this.salesOrdersService.getMyOrders(currentUser, query);
  }

  @Post('my/orders')
  createMyOrder(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateSalesOrderDto,
  ) {
    return this.salesOrdersService.create(currentUser, dto);
  }

  @Get('my/orders/:id')
  getMyOrderById(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesOrdersService.getMyOrderById(currentUser, id);
  }

  @Post('my/orders/:id/repeat')
  repeatMyOrder(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesOrdersService.repeatMyOrder(currentUser, id);
  }
}
