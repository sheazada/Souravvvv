import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateVehicleDto, QueryVehiclesDto, UpdateVehicleDto } from './dto';
import { VehiclesService } from './vehicles.service';

@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(currentUser, dto);
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryVehiclesDto) {
    return this.vehiclesService.findAll(currentUser, query);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.vehiclesService.findOne(currentUser, id);
  }

  @Patch(':id')
  update(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehiclesService.update(currentUser, id, dto);
  }

  @Patch(':id/status')
  updateStatus(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body('isActive') isActive: boolean) {
    return this.vehiclesService.update(currentUser, id, { isActive });
  }
}
