import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminWorkoutSectionsService } from '../services/admin-workout-sections.service';

@Controller('admin/workout-collections/:collectionId/sections')
@UseGuards(JwtAuthGuard)
export class AdminWorkoutSectionsController {
  constructor(private sectionsService: AdminWorkoutSectionsService) {}

  @Get()
  async getSections(@Param('collectionId') collectionId: string) {
    return this.sectionsService.getSections(collectionId);
  }

  @Post()
  async createSection(
    @Param('collectionId') collectionId: string,
    @Body() body: any,
  ) {
    return this.sectionsService.createSection(collectionId, body);
  }

  @Put(':sectionId')
  async updateSection(
    @Param('sectionId') sectionId: string,
    @Body() body: any,
  ) {
    return this.sectionsService.updateSection(sectionId, body);
  }

  @Delete(':sectionId')
  async deleteSection(@Param('sectionId') sectionId: string) {
    return this.sectionsService.deleteSection(sectionId);
  }

  @Post(':sectionId/items')
  async createItem(
    @Param('sectionId') sectionId: string,
    @Body() body: any,
  ) {
    return this.sectionsService.createSectionItem(sectionId, body);
  }

  @Put(':sectionId/items/:itemId')
  async updateItem(
    @Param('itemId') itemId: string,
    @Body() body: any,
  ) {
    return this.sectionsService.updateSectionItem(itemId, body);
  }

  @Delete(':sectionId/items/:itemId')
  async deleteItem(@Param('itemId') itemId: string) {
    return this.sectionsService.deleteSectionItem(itemId);
  }
}
