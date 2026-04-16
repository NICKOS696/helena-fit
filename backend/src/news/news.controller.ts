import { Controller, Get, Param, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private newsService: NewsService) {}

  @Get()
  async getNews(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.newsService.getNews(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get(':id')
  async getNewsById(@Param('id') id: string) {
    return this.newsService.getNewsById(id);
  }
}
