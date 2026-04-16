import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('recipes')
@UseGuards(OptionalJwtAuthGuard)
export class RecipesController {
  constructor(private recipesService: RecipesService) {}

  @Get()
  async getCollections(@Request() req) {
    return this.recipesService.getCollections(req.user?.id);
  }

  @Get(':id')
  async getCollection(
    @Param('id') id: string,
    @Query('category') category: string,
    @Request() req,
  ) {
    return this.recipesService.getCollection(id, req.user?.id, category);
  }

  @Get(':collectionId/recipe/:recipeId')
  async getRecipe(
    @Param('collectionId') collectionId: string,
    @Param('recipeId') recipeId: string,
    @Request() req,
  ) {
    return this.recipesService.getRecipe(collectionId, recipeId, req.user?.id);
  }
}
