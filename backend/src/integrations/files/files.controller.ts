import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreateFileAttachmentDto, QueryAttachmentsDto } from './dto';
import { FilesService } from './files.service';

@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateFileAttachmentDto) {
    return this.filesService.create(currentUser, dto);
  }

  @Get()
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryAttachmentsDto) {
    return this.filesService.findAll(currentUser, query);
  }

  @Get('by-entity')
  findByEntity(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryAttachmentsDto) {
    return this.filesService.findAll(currentUser, query);
  }

  @Get(':id')
  findOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.findOne(currentUser, id);
  }

  @Delete(':id')
  remove(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.filesService.remove(currentUser, id);
  }
}
