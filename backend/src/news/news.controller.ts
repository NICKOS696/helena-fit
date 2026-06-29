import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { NewsService } from './news.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('news')
@UseGuards(OptionalJwtAuthGuard)
export class NewsController {
  constructor(private newsService: NewsService) {}

  @Get()
  async getNews(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    return this.newsService.getNews(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      req?.user?.telegramId,
    );
  }

  @Get(':id')
  async getNewsById(@Param('id') id: string, @Request() req: any) {
    return this.newsService.getNewsById(id, req?.user?.telegramId);
  }
}
