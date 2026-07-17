import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { ClaimsService } from './claims.service';
import { CreateClaimDto, CreateSalesReturnDto, QueryClaimsDto, QuerySalesReturnsDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post('sales-returns')
  createReturn(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateSalesReturnDto,
  ) {
    return this.claimsService.createSalesReturn(currentUser, dto);
  }

  @Get('sales-returns')
  findAllReturns(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QuerySalesReturnsDto,
  ) {
    return this.claimsService.findAllSalesReturns(currentUser, query);
  }

  @Get('sales-returns/:id')
  findOneReturn(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.claimsService.findOneSalesReturn(currentUser, id);
  }

  @Post('sales-returns/:id/approve')
  approveReturn(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.claimsService.approveSalesReturn(currentUser, id);
  }

  @Post('sales-returns/:id/reject')
  rejectReturn(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('remarks') remarks?: string,
  ) {
    return this.claimsService.rejectSalesReturn(currentUser, id, remarks);
  }

  @Get('my/returns')
  getMyReturns(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QuerySalesReturnsDto,
  ) {
    return this.claimsService.findAllSalesReturns(currentUser, query);
  }

  @Post('my/returns')
  createMyReturn(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateSalesReturnDto,
  ) {
    return this.claimsService.createSalesReturn(currentUser, dto);
  }

  @Post('claims')
  createClaim(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateClaimDto,
  ) {
    return this.claimsService.createClaim(currentUser, dto);
  }

  @Get('claims')
  findAllClaims(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryClaimsDto,
  ) {
    return this.claimsService.findAllClaims(currentUser, query);
  }

  @Post('claims/:id/approve')
  approveClaim(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('resolutionNotes') resolutionNotes?: string,
  ) {
    return this.claimsService.approveClaim(currentUser, id, resolutionNotes);
  }
}
