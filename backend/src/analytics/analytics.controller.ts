import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { TrackViewDto, ContentType } from './dto/track-view.dto';
import { CreateManualPaymentDto } from './dto/manual-payment.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Записать просмотр (для пользователей)
   */
  @Post('track')
  @UseGuards(JwtAuthGuard)
  async trackView(@Request() req, @Body() dto: TrackViewDto) {
    const userId = req.user.id;
    return this.analyticsService.trackView(userId, dto.itemType, dto.itemId);
  }

  /**
   * Получить статистику по коллекциям (для админов)
   */
  @Get('collection-stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getCollectionStats() {
    return this.analyticsService.getCollectionStats();
  }

  /**
   * Получить статистику по рецептам (для админов)
   */
  @Get('recipe-stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getRecipeStats() {
    return this.analyticsService.getRecipeStats();
  }

  /**
   * Получить статистику по контенту (для админов)
   */
  @Get('content-stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getContentStats(@Query('type') type?: ContentType) {
    return this.analyticsService.getContentStats(type);
  }

  /**
   * Получить общую статистику (для админов)
   */
  @Get('overall')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getOverallStats() {
    return this.analyticsService.getOverallStats();
  }

  /**
   * Получить активность пользователей (для админов)
   */
  @Get('user-activity')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserActivity() {
    return this.analyticsService.getUserActivity();
  }

  /**
   * Что именно открывал конкретный пользователь (для админов)
   */
  @Get('user-views')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUserViews(@Query('userId') userId: string) {
    return this.analyticsService.getUserViews(userId);
  }

  /**
   * Покупки: кто, что и когда купил (для админов)
   */
  @Get('purchases')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getPurchases() {
    return this.analyticsService.getPurchases();
  }

  /**
   * Ручные (рублёвые) оплаты — учёт «мимо Payme» (для админов)
   */
  @Get('manual-payments')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async listManualPayments() {
    return this.analyticsService.listManualPayments();
  }

  @Post('manual-payments')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createManualPayment(@Body() dto: CreateManualPaymentDto) {
    return this.analyticsService.createManualPayment(dto);
  }

  @Delete('manual-payments/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async deleteManualPayment(@Param('id') id: string) {
    return this.analyticsService.deleteManualPayment(id);
  }
}
