import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import {
  CancelRetailerDebitNoteDto,
  CreateRetailerDebitNoteDto,
  QueryRetailerDebitNotesDto,
} from './dto';
import { RetailerDebitNotesService } from './retailer-debit-notes.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class RetailerDebitNotesController {
  constructor(private readonly retailerDebitNotesService: RetailerDebitNotesService) {}

  @Get('retailer-debit-notes')
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: QueryRetailerDebitNotesDto) {
    return this.retailerDebitNotesService.findAll(currentUser, query);
  }

  @Post('retailer-debit-notes')
  create(@CurrentUser() currentUser: AuthenticatedUser, @Body() dto: CreateRetailerDebitNoteDto) {
    return this.retailerDebitNotesService.create(currentUser, dto);
  }

  @Get('retailer-debit-notes/:id')
  findOne(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.retailerDebitNotesService.findOne(currentUser, id);
  }

  @Post('retailer-debit-notes/:id/post')
  post(@CurrentUser() currentUser: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.retailerDebitNotesService.post(currentUser, id);
  }

  @Post('retailer-debit-notes/:id/cancel')
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRetailerDebitNoteDto,
  ) {
    return this.retailerDebitNotesService.cancel(currentUser, id, dto);
  }

  @Get('retailers/:id/debit-notes')
  getRetailerNotes(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryRetailerDebitNotesDto,
  ) {
    return this.retailerDebitNotesService.getRetailerNotes(currentUser, retailerId, query);
  }

  @Get('my/debit-notes')
  getMyNotes(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryRetailerDebitNotesDto,
  ) {
    return this.retailerDebitNotesService.getMyNotes(currentUser, query);
  }
}
