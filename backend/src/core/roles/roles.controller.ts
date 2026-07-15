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
  AssignPermissionsDto,
  CreateRoleDto,
  QueryRolesDto,
  UpdateRoleDto,
} from './dto';
import { RolesService } from './roles.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryRolesDto,
  ) {
    return this.rolesService.findAll(currentUser, query);
  }

  @Post('roles')
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
  ) {
    return this.rolesService.create(currentUser, dto);
  }

  @Get('roles/:id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rolesService.findOne(currentUser, id);
  }

  @Patch('roles/:id')
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(currentUser, id, dto);
  }

  @Patch('roles/:id/permissions')
  assignPermissions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(currentUser, id, dto);
  }

  @Delete('roles/:id')
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.rolesService.remove(currentUser, id);
  }

  @Get('permissions')
  findAllPermissions(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('module') module?: string,
  ) {
    return this.rolesService.findAllPermissions(currentUser, module);
  }
}
