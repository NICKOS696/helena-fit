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
import {
  AdminWorkoutsService,
  CreateWorkoutCollectionDto,
  CreateWorkoutDto,
} from '../services/admin-workouts.service';

@Controller('admin/workouts')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminWorkoutsController {
  constructor(private adminWorkoutsService: AdminWorkoutsService) {}

  @Get('collections')
  async getCollections() {
    return this.adminWorkoutsService.getCollections();
  }

  @Get('collections/:id')
  async getCollection(@Param('id') id: string) {
    return this.adminWorkoutsService.getCollection(id);
  }

  @Post('collections')
  async createCollection(@Body() data: CreateWorkoutCollectionDto) {
    return this.adminWorkoutsService.createCollection(data);
  }

  @Put('collections/:id')
  async updateCollection(
    @Param('id') id: string,
    @Body() data: Partial<CreateWorkoutCollectionDto>,
  ) {
    return this.adminWorkoutsService.updateCollection(id, data);
  }

  @Delete('collections/:id')
  async deleteCollection(@Param('id') id: string) {
    return this.adminWorkoutsService.deleteCollection(id);
  }

  @Post('collections/:collectionId/workouts')
  async createWorkout(
    @Param('collectionId') collectionId: string,
    @Body() data: CreateWorkoutDto,
  ) {
    return this.adminWorkoutsService.createWorkout(collectionId, data);
  }

  @Put('workouts/:id')
  async updateWorkout(@Param('id') id: string, @Body() data: Partial<CreateWorkoutDto>) {
    return this.adminWorkoutsService.updateWorkout(id, data);
  }

  @Delete('workouts/:id')
  async deleteWorkout(@Param('id') id: string) {
    return this.adminWorkoutsService.deleteWorkout(id);
  }

  @Put('collections/:collectionId/reorder')
  async reorderWorkouts(
    @Param('collectionId') collectionId: string,
    @Body() body: { workoutIds: string[] },
  ) {
    return this.adminWorkoutsService.reorderWorkouts(collectionId, body.workoutIds);
  }
}
