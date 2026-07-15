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
  CancelCreditNoteDto,
  CreateRetailerCreditNoteDto,
  QueryCreditNotesDto,
} from './dto';
import { RetailerCreditNotesService } from './retailer-credit-notes.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class RetailerCreditNotesController {
  constructor(private readonly retailerCreditNotesService: RetailerCreditNotesService) {}

  @Get('credit-notes')
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryCreditNotesDto,
  ) {
    return this.retailerCreditNotesService.findAll(currentUser, query);
  }

  @Post('credit-notes')
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateRetailerCreditNoteDto,
  ) {
    return this.retailerCreditNotesService.create(currentUser, dto);
  }

  @Get('credit-notes/:id')
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailerCreditNotesService.findOne(currentUser, id);
  }

  @Post('credit-notes/:id/post')
  post(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.retailerCreditNotesService.post(currentUser, id);
  }

  @Post('credit-notes/:id/cancel')
  cancel(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelCreditNoteDto,
  ) {
    return this.retailerCreditNotesService.cancel(currentUser, id, dto);
  }

  @Get('retailers/:id/credit-notes')
  getRetailerNotes(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) retailerId: string,
    @Query() query: QueryCreditNotesDto,
  ) {
    return this.retailerCreditNotesService.getRetailerNotes(currentUser, retailerId, query);
  }

  @Get('my/credit-notes')
  getMyNotes(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryCreditNotesDto,
  ) {
    return this.retailerCreditNotesService.getMyNotes(currentUser, query);
  }
}
