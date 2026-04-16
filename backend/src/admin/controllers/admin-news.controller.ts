import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { AdminNewsService, CreateNewsDto } from '../services/admin-news.service';

@Controller('admin/news')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminNewsController {
  constructor(private adminNewsService: AdminNewsService) {}

  @Get()
  async getNews() {
    return this.adminNewsService.getNews();
  }

  @Get(':id')
  async getNewsById(@Param('id') id: string) {
    return this.adminNewsService.getNewsById(id);
  }

  @Post()
  async createNews(@Body() data: CreateNewsDto) {
    return this.adminNewsService.createNews(data);
  }

  @Put(':id')
  async updateNews(@Param('id') id: string, @Body() data: Partial<CreateNewsDto>) {
    return this.adminNewsService.updateNews(id, data);
  }

  @Delete(':id')
  async deleteNews(@Param('id') id: string) {
    return this.adminNewsService.deleteNews(id);
  }
}
