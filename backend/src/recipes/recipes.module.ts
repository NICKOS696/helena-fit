import { Module } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { FavoritesService } from './favorites.service';
import { RecipesController } from './recipes.controller';

@Module({
  controllers: [RecipesController],
  providers: [RecipesService, FavoritesService],
})
export class RecipesModule {}
