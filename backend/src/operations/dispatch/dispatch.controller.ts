import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  AssignDispatchResourcesDto,
  CreateDispatchTripDto,
  GenerateDispatchTripDto,
  QueryDispatchTripsDto,
} from './dto';
import { DispatchService } from './dispatch.service';

@UseGuards(JwtAuthGuard)
@Controller('dispatch-trips')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryDispatchTripsDto,
  ) {
    return this.dispatchService.findAll(currentUser, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateDispatchTripDto,
  ) {
    return this.dispatchService.create(currentUser, dto);
  }

  @Post('generate')
  generate(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: GenerateDispatchTripDto,
  ) {
    return this.dispatchService.generate(currentUser, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dispatchService.findOne(currentUser, id);
  }

  @Post(':id/assign-resources')
  assignResources(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDispatchResourcesDto,
  ) {
    return this.dispatchService.assignResources(currentUser, id, dto);
  }

  @Post(':id/start')
  start(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dispatchService.start(currentUser, id);
  }

  @Post(':id/complete')
  complete(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dispatchService.complete(currentUser, id);
  }

  @Get(':id/stops')
  getStops(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dispatchService.getStops(currentUser, id);
  }

  @Get(':id/loading-sheet')
  getLoadingSheet(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dispatchService.getLoadingSheet(currentUser, id);
  }

  @Post(':id/loading-sheet/generate')
  generateLoadingSheet(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dispatchService.generateLoadingSheet(currentUser, id);
  }

  @Post(':id/challan/generate')
  generateChallan(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dispatchService.generateChallan(currentUser, id);
  }

  @Get(':id/challan')
  getChallan(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dispatchService.getChallan(currentUser, id);
  }

  @Get(':id/challan/export')
  exportChallan(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format = 'pdf',
  ) {
    return this.dispatchService.exportChallan(currentUser, id, format);
  }
}
