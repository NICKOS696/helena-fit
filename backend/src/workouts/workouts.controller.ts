import { Controller, Get, Post, Param, Request, UseGuards } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('workouts')
@UseGuards(OptionalJwtAuthGuard)
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Get()
  async getCollections(@Request() req) {
    return this.workoutsService.getCollections(req.user?.id);
  }

  @Post('progress/:itemId/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleProgress(@Param('itemId') itemId: string, @Request() req) {
    return this.workoutsService.toggleProgress(req.user.id, itemId);
  }

  @Get(':id')
  async getCollection(@Param('id') id: string, @Request() req) {
    return this.workoutsService.getCollection(id, req.user?.id);
  }
}
