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
  CreateDemandConsolidationDto,
  QueryDemandConsolidationsDto,
  UpdateDemandConsolidationDto,
  UpdateDemandConsolidationItemDto,
} from './dto';
import { DemandConsolidationsService } from './demand-consolidations.service';

@UseGuards(JwtAuthGuard)
@Controller('demand-consolidations')
export class DemandConsolidationsController {
  constructor(
    private readonly demandConsolidationsService: DemandConsolidationsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryDemandConsolidationsDto,
  ) {
    return this.demandConsolidationsService.findAll(currentUser, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateDemandConsolidationDto,
  ) {
    return this.demandConsolidationsService.create(currentUser, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.demandConsolidationsService.findOne(currentUser, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDemandConsolidationDto,
  ) {
    return this.demandConsolidationsService.update(currentUser, id, dto);
  }

  @Post(':id/rebuild')
  rebuild(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.demandConsolidationsService.rebuild(currentUser, id);
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.demandConsolidationsService.approve(currentUser, id);
  }

  @Get(':id/items')
  getItems(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.demandConsolidationsService.getItems(currentUser, id);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateDemandConsolidationItemDto,
  ) {
    return this.demandConsolidationsService.updateItem(
      currentUser,
      id,
      itemId,
      dto,
    );
  }

  @Get(':id/source-orders')
  getSourceOrders(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.demandConsolidationsService.getSourceOrders(currentUser, id);
  }

  @Get(':id/summary/product-wise')
  getProductWiseSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.demandConsolidationsService.getProductWiseSummary(
      currentUser,
      id,
    );
  }

  @Get(':id/summary/route-wise')
  getRouteWiseSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.demandConsolidationsService.getRouteWiseSummary(
      currentUser,
      id,
    );
  }

  @Get(':id/summary/area-wise')
  getAreaWiseSummary(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.demandConsolidationsService.getAreaWiseSummary(
      currentUser,
      id,
    );
  }

  @Get(':id/export')
  export(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format = 'pdf',
  ) {
    return this.demandConsolidationsService.export(currentUser, id, format);
  }

  @Post(':id/share/whatsapp')
  shareWhatsApp(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.demandConsolidationsService.shareWhatsApp(currentUser, id);
  }
}
