import { Controller, Get, Post, Delete, Param, Query, Request, UseGuards } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { FavoritesService } from './favorites.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('recipes')
@UseGuards(OptionalJwtAuthGuard)
export class RecipesController {
  constructor(
    private recipesService: RecipesService,
    private favoritesService: FavoritesService,
  ) {}

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

  @Get('favorites/all')
  @UseGuards(JwtAuthGuard)
  async getFavorites(@Request() req) {
    const userId = req.user.id;
    return this.favoritesService.getFavorites(userId);
  }

  @Post('favorites/:recipeId')
  @UseGuards(JwtAuthGuard)
  async addToFavorites(@Param('recipeId') recipeId: string, @Request() req) {
    const userId = req.user.id;
    return this.favoritesService.addToFavorites(userId, recipeId);
  }

  @Delete('favorites/:recipeId')
  @UseGuards(JwtAuthGuard)
  async removeFromFavorites(@Param('recipeId') recipeId: string, @Request() req) {
    const userId = req.user.id;
    return this.favoritesService.removeFromFavorites(userId, recipeId);
  }
}
