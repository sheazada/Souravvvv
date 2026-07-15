import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CreateCollectionEntryDto,
  CreateCrateEntryDto,
  CreateProofOfDeliveryDto,
  UpdateDeliveryStopStatusDto,
} from './dto';
import { DeliveryService } from './delivery.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Get('delivery-stops/:id')
  getStop(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deliveryService.getStop(currentUser, id);
  }

  @Post('delivery-stops/:id/status')
  updateStopStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStopStatusDto,
  ) {
    return this.deliveryService.updateStopStatus(currentUser, id, dto);
  }

  @Post('delivery-stops/:id/mark-delivered')
  markDelivered(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStopStatusDto,
  ) {
    return this.deliveryService.updateStopStatus(currentUser, id, {
      ...dto,
      status: 'delivered',
    });
  }

  @Post('delivery-stops/:id/mark-partial')
  markPartial(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStopStatusDto,
  ) {
    return this.deliveryService.updateStopStatus(currentUser, id, {
      ...dto,
      status: 'partial',
    });
  }

  @Post('delivery-stops/:id/mark-failed')
  markFailed(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStopStatusDto,
  ) {
    return this.deliveryService.updateStopStatus(currentUser, id, {
      ...dto,
      status: 'failed',
    });
  }

  @Post('delivery-stops/:id/mark-refused')
  markRefused(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStopStatusDto,
  ) {
    return this.deliveryService.updateStopStatus(currentUser, id, {
      ...dto,
      status: 'refused',
    });
  }

  @Post('delivery-stops/:id/collections')
  addCollection(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCollectionEntryDto,
  ) {
    return this.deliveryService.addCollection(currentUser, id, dto);
  }

  @Post('delivery-stops/:id/crates')
  addCrateTransaction(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCrateEntryDto,
  ) {
    return this.deliveryService.addCrateTransaction(currentUser, id, dto);
  }

  @Post('delivery-stops/:id/proof-of-delivery')
  addProofOfDelivery(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProofOfDeliveryDto,
  ) {
    return this.deliveryService.addProofOfDelivery(currentUser, id, dto);
  }

  @Get('my/trips/today')
  getMyTripsToday(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.deliveryService.getMyTripsToday(currentUser);
  }

  @Get('my/trips/:id')
  getMyTrip(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deliveryService.getMyTrip(currentUser, id);
  }

  @Get('my/trips/:id/stops')
  getMyTripStops(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deliveryService.getMyTripStops(currentUser, id);
  }

  @Post('my/delivery-stops/:id/status')
  updateMyStopStatus(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStopStatusDto,
  ) {
    return this.deliveryService.updateStopStatus(currentUser, id, dto);
  }

  @Post('my/delivery-stops/:id/collections')
  addMyCollection(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCollectionEntryDto,
  ) {
    return this.deliveryService.addCollection(currentUser, id, dto);
  }

  @Post('my/delivery-stops/:id/crates')
  addMyCrateTransaction(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCrateEntryDto,
  ) {
    return this.deliveryService.addCrateTransaction(currentUser, id, dto);
  }

  @Post('my/delivery-stops/:id/proof-of-delivery')
  addMyProofOfDelivery(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProofOfDeliveryDto,
  ) {
    return this.deliveryService.addProofOfDelivery(currentUser, id, dto);
  }

  @Get('my/collection-summary')
  getCollectionSummary(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.deliveryService.getCollectionSummary(currentUser);
  }
}
