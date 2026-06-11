import { Controller, Post, Get, Body, UseGuards, Request, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { TrackViewDto, ContentType } from './dto/track-view.dto';

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
}
