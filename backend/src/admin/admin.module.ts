import { Module } from '@nestjs/common';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminWorkoutsController } from './controllers/admin-workouts.controller';
import { AdminRecipesController } from './controllers/admin-recipes.controller';
import { AdminNewsController } from './controllers/admin-news.controller';
import { AdminWorkoutSectionsController } from './controllers/admin-workout-sections.controller';
import { AdminUsersService } from './services/admin-users.service';
import { AdminWorkoutsService } from './services/admin-workouts.service';
import { AdminRecipesService } from './services/admin-recipes.service';
import { AdminNewsService } from './services/admin-news.service';
import { AdminWorkoutSectionsService } from './services/admin-workout-sections.service';

@Module({
  controllers: [
    AdminUsersController,
    AdminWorkoutsController,
    AdminRecipesController,
    AdminNewsController,
    AdminWorkoutSectionsController,
  ],
  providers: [
    AdminUsersService,
    AdminWorkoutsService,
    AdminRecipesService,
    AdminNewsService,
    AdminWorkoutSectionsService,
  ],
})
export class AdminModule {}
