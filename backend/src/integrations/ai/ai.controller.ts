import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AiService } from './ai.service';
import { AssistantQueryDto, CreateForecastRunDto, OcrInvoiceDto, QueryForecastsDto, VoiceOrderDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ai/ocr/purchase-invoice')
  parsePurchaseInvoiceOcr(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: OcrInvoiceDto,
  ) {
    return this.aiService.parsePurchaseInvoiceOcr(currentUser, dto);
  }

  @Post('ai/voice-order')
  parseVoiceOrder(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: VoiceOrderDto,
  ) {
    return this.aiService.parseVoiceOrder(currentUser, dto);
  }

  @Post('ai/assistant/query')
  queryAssistant(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: AssistantQueryDto,
  ) {
    return this.aiService.queryAssistant(currentUser, dto);
  }

  @Post('forecast-runs')
  createForecastRun(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateForecastRunDto,
  ) {
    return this.aiService.createForecastRun(currentUser, dto);
  }

  @Get('forecast-runs')
  findAllForecastRuns(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: QueryForecastsDto,
  ) {
    return this.aiService.findAllForecastRuns(currentUser, query);
  }

  @Get('forecast-runs/:id')
  findOneForecastRun(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.aiService.findOneForecastRun(currentUser, id);
  }
}
