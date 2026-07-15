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
  CreateStockAdjustmentDto,
  QueryInventoryBatchesDto,
  QueryStockAdjustmentsDto,
  QueryStockMovementsDto,
  QueryStockOnHandDto,
  UpdateStockAdjustmentDto,
} from './dto';
import { InventoryService } from './inventory.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('inventory/stock-on-hand')
  getStockOnHand(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryStockOnHandDto,
  ) {
    return this.inventoryService.getStockOnHand(currentUser, query);
  }

  @Get('inventory/batches')
  getBatches(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryInventoryBatchesDto,
  ) {
    return this.inventoryService.getBatches(currentUser, query);
  }

  @Get('inventory/batches/:id')
  getBatch(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.getBatch(currentUser, id);
  }

  @Get('inventory/stock-movements')
  getStockMovements(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryStockMovementsDto,
  ) {
    return this.inventoryService.getStockMovements(currentUser, query);
  }

  @Get('inventory/stock-movements/:id')
  getStockMovement(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.getStockMovement(currentUser, id);
  }

  @Get('stock-adjustments')
  getStockAdjustments(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryStockAdjustmentsDto,
  ) {
    return this.inventoryService.getStockAdjustments(currentUser, query);
  }

  @Post('stock-adjustments')
  createStockAdjustment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateStockAdjustmentDto,
  ) {
    return this.inventoryService.createStockAdjustment(currentUser, dto);
  }

  @Get('stock-adjustments/:id')
  getStockAdjustment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.getStockAdjustment(currentUser, id);
  }

  @Patch('stock-adjustments/:id')
  updateStockAdjustment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockAdjustmentDto,
  ) {
    return this.inventoryService.updateStockAdjustment(currentUser, id, dto);
  }

  @Post('stock-adjustments/:id/approve')
  approveStockAdjustment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.approveStockAdjustment(currentUser, id);
  }

  @Post('stock-adjustments/:id/post')
  postStockAdjustment(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.postStockAdjustment(currentUser, id);
  }

  @Get('inventory/alerts/low-stock')
  getLowStockAlerts(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.inventoryService.getLowStockAlerts(currentUser);
  }

  @Get('inventory/alerts/expiring-products')
  getExpiringProductAlerts(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.inventoryService.getExpiringProductAlerts(currentUser);
  }
}
