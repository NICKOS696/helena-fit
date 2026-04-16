import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('workouts')
@UseGuards(OptionalJwtAuthGuard)
export class WorkoutsController {
  constructor(private workoutsService: WorkoutsService) {}

  @Get()
  async getCollections(@Request() req) {
    return this.workoutsService.getCollections(req.user?.id);
  }

  @Get(':id')
  async getCollection(@Param('id') id: string, @Request() req) {
    return this.workoutsService.getCollection(id, req.user?.id);
  }
}
