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
  CreateSupplierReturnDto,
  QuerySupplierReturnsDto,
  UpdateSupplierReturnDto,
} from './dto';
import { ReturnsService } from './returns.service';

@UseGuards(JwtAuthGuard)
@Controller('supplier-returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QuerySupplierReturnsDto,
  ) {
    return this.returnsService.findAll(currentUser, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateSupplierReturnDto,
  ) {
    return this.returnsService.create(currentUser, dto);
  }

  @Get(':id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.findOne(currentUser, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierReturnDto,
  ) {
    return this.returnsService.update(currentUser, id, dto);
  }

  @Post(':id/approve')
  approve(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.approve(currentUser, id);
  }

  @Post(':id/post')
  post(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.post(currentUser, id);
  }

  @Get(':id/export')
  export(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format = 'pdf',
  ) {
    return this.returnsService.export(currentUser, id, format);
  }
}
