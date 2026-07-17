import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateEmployeeDto, QueryEmployeesDto, UpdateEmployeeDto } from './dto';
import { EmployeesService } from './employees.service';

@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(currentUser, dto);
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryEmployeesDto) {
    return this.employeesService.findAll(currentUser, query);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findOne(currentUser, id);
  }

  @Patch(':id')
  update(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(currentUser, id, dto);
  }

  @Patch(':id/status')
  updateStatus(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body('isActive') isActive: boolean) {
    return this.employeesService.update(currentUser, id, { isActive });
  }
}
