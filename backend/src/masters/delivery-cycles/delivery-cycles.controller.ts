import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateDeliveryCycleDto, QueryDeliveryCyclesDto, UpdateCutoffRulesDto, UpdateDeliveryCycleDto } from './dto';
import { DeliveryCyclesService } from './delivery-cycles.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class DeliveryCyclesController {
  constructor(private readonly deliveryCyclesService: DeliveryCyclesService) {}

  @Post('delivery-cycles')
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateDeliveryCycleDto) {
    return this.deliveryCyclesService.create(currentUser, dto);
  }

  @Get('delivery-cycles')
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryDeliveryCyclesDto) {
    return this.deliveryCyclesService.findAll(currentUser, query);
  }

  @Get('delivery-cycles/:id')
  findOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.deliveryCyclesService.findOne(currentUser, id);
  }

  @Patch('delivery-cycles/:id')
  update(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDeliveryCycleDto) {
    return this.deliveryCyclesService.update(currentUser, id, dto);
  }

  @Patch('delivery-cycles/:id/status')
  updateStatus(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body('status') status: string) {
    return this.deliveryCyclesService.update(currentUser, id, { status });
  }

  @Get('cutoff-rules')
  getCutoffRules(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.deliveryCyclesService.getCutoffRules(currentUser);
  }

  @Put('cutoff-rules')
  updateCutoffRules(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: UpdateCutoffRulesDto) {
    return this.deliveryCyclesService.updateCutoffRules(currentUser, dto);
  }

  @Post('delivery-cycles/resolve')
  resolve(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.deliveryCyclesService.resolveDeliveryCycles(currentUser);
  }
}
